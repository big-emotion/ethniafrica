-- Keep authored quiz banks isolated by locale. Existing rows are French and
-- remain readable without any release-time configuration change.
alter table quiz_questions
  add column if not exists locale text not null default 'fr';

alter table quiz_questions
  drop constraint if exists quiz_questions_locale_check;

alter table quiz_questions
  add constraint quiz_questions_locale_check
  check (locale in ('en', 'fr'));

-- One active question per subject/template/language. The previous identity
-- prevented an English equivalent from coexisting with its French source.
drop index if exists uq_quiz_questions_active_identity;

create unique index if not exists uq_quiz_questions_active_identity
  on quiz_questions (entity_id, template_id, locale)
  where revoked_at is null;

drop index if exists idx_quiz_questions_active_subject;

create index if not exists idx_quiz_questions_active_subject
  on quiz_questions (locale, entity_type, entity_id, template_id)
  where revoked_at is null;

-- The dedicated search lens is also a serving path. Give it the same French
-- default and prevent either authored bank from leaking into the other.
drop function if exists public.afrik_search_quiz(text, int, int);

create or replace function public.afrik_search_quiz(
  p_q      text default null,
  p_limit  int  default 20,
  p_offset int  default 0,
  p_lang   text default 'fr'
)
returns jsonb
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
with q as (
  select
    case when coalesce(btrim(p_q), '') = '' then null
         else public.afrik_prefix_tsquery(btrim(p_q)) end as tsq,
    case when coalesce(btrim(p_q), '') = '' then null
         else public.afrik_prefix_tsquery(
                public.afrik_unaccent(btrim(p_q))) end as tsq_unaccent,
    case when coalesce(btrim(p_q), '') = '' then null
         else public.afrik_unaccent(lower(btrim(p_q))) end as exact_key
),
matched as (
  select
    qq.id, qq.prompt_fr, qq.stimulus_fr, qq.entity_type, qq.entity_id,
    coalesce(
      sp.name_main,
      case when p_lang = 'en' then coalesce(sc.name_en, sc.name_fr)
           else sc.name_fr end
    ) as subject_name,
    coalesce(
      qq.search_vector @@ q.tsq_unaccent
      or sp.name_unaccent_vector @@ q.tsq_unaccent
      or sc.name_unaccent_vector @@ q.tsq_unaccent,
      false) as lexical_match,
    greatest(
      case when qq.search_vector @@ q.tsq_unaccent
           then ts_rank('{0.1,0.3,0.6,1.0}', qq.search_vector, q.tsq_unaccent)
           else 0 end,
      case when sp.name_unaccent_vector @@ q.tsq_unaccent
           then ts_rank('{0.1,0.3,0.6,1.0}', sp.name_unaccent_vector,
                        q.tsq_unaccent)
           else 0 end,
      case when sc.name_unaccent_vector @@ q.tsq_unaccent
           then ts_rank('{0.1,0.3,0.6,1.0}', sc.name_unaccent_vector,
                        q.tsq_unaccent)
           else 0 end
    )::real as relevance,
    (q.exact_key is not null
     and public.afrik_unaccent(lower(coalesce(
       sp.name_main,
       case when p_lang = 'en' then coalesce(sc.name_en, sc.name_fr)
            else sc.name_fr end,
       ''))) = q.exact_key) as exact_match
  from public.quiz_questions qq
  cross join q
  left join public.afrik_peoples sp
    on qq.entity_type = 'people' and sp.id = qq.entity_id
  left join public.afrik_countries sc
    on qq.entity_type = 'country' and sc.id = qq.entity_id
  where qq.revoked_at is null
    and qq.locale = p_lang
    and q.tsq_unaccent is not null
    and (qq.search_vector @@ q.tsq_unaccent
         or sp.name_unaccent_vector @@ q.tsq_unaccent
         or sc.name_unaccent_vector @@ q.tsq_unaccent)
),
page as (
  select m.* from matched m
  order by m.exact_match desc, m.lexical_match desc, m.relevance desc,
           m.subject_name asc, m.id asc
  limit coalesce(p_limit, 20) offset coalesce(p_offset, 0)
),
enriched as (
  select
    page.exact_match,
    page.lexical_match,
    page.relevance,
    page.id::text     as id,
    page.prompt_fr    as prompt,
    page.entity_type  as "entityType",
    page.entity_id    as "entityId",
    page.subject_name as "subjectName",
    page.exact_match  as "exactMatch",
    public.afrik_search_normalized_score(
      page.exact_match, page.lexical_match, page.relevance) as "normalizedScore",
    ts_headline(
      case when p_lang = 'en' then 'english'::regconfig
           else 'french'::regconfig end,
      concat_ws(' · ', nullif(page.subject_name, ''),
                       nullif(page.prompt_fr, ''),
                       nullif(page.stimulus_fr, '')),
      coalesce((select tsq from q), (select tsq_unaccent from q)),
      'StartSel=[[, StopSel=]], MaxFragments=1, MaxWords=22, MinWords=6, '
      'FragmentDelimiter= … , HighlightAll=FALSE'
    ) as snippet
  from page
)
select jsonb_build_object(
  'total', (select count(*) from matched),
  'rows', coalesce(
    (select jsonb_agg(to_jsonb(e) - 'exact_match' - 'lexical_match'
                      order by e.exact_match desc, e.lexical_match desc,
                               e.relevance desc, e."subjectName" asc, e.id asc)
       from enriched e),
    '[]'::jsonb)
);
$$;

comment on function public.afrik_search_quiz(text, int, int, text) is
  'Ranked, paginated search over one locale of the active quiz bank. p_lang defaults to fr so existing callers retain production behaviour. English returns only English-authored rows and an empty result until that bank is published. REQ-002, REQ-121, REQ-145.';

revoke all on function public.afrik_search_quiz(text, int, int, text) from public;
grant execute on function public.afrik_search_quiz(text, int, int, text)
  to anon, authenticated, service_role;
