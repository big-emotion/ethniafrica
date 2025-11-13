"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/PageLayout";
import { useEffect } from "react";
import { Language } from "@/types/ethnicity";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Script from "next/script";

export default function AboutPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  // Sync language from URL param
  useEffect(() => {
    if (lang && ["en", "fr", "es", "pt"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  const content = {
    en: {
      title: "About",
      about: {
        title: "About the project",
        text1: (
          <>
            The <strong>Dictionary of African Ethnic Groups</strong> is a
            personal project whose goal is to{" "}
            <strong>make knowledge about Africa clear and accessible</strong>.
          </>
        ),
        text2: (
          <>
            Before modern nations and states, there were{" "}
            <strong>ethnic groups, peoples, and kingdoms</strong>. History and
            borders have sometimes erased them, yet these peoples still exist
            today — carrying their languages, cultures, and traditions.
          </>
        ),
        text3:
          "I am currently collecting and organizing available information to include it in this dictionary.",
        text4: (
          <>
            The work is long and challenging because it is{" "}
            <strong>difficult to find reliable data about Africa</strong>, but
            the goal is to bring this knowledge together and make it easy to
            explore.
          </>
        ),
      },
      contribution: {
        title: "Contribution and participation",
        text1: (
          <>
            For now, the site is powered by <strong>CSV files</strong> that
            contain data on countries, regions, and ethnic groups. I keep
            searching and structuring this information over time.
          </>
        ),
        text2: (
          <>
            I am{" "}
            <strong>open to all kinds of proposals and contributions</strong>,
            whether it's sharing CSV data, sources, corrections, or improvement
            ideas. If you'd like to help, feel free to contact me or contribute
            directly through the{" "}
            <a
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              GitHub repository
            </a>
            .
          </>
        ),
      },
      contact: {
        title: "Contact",
        text: "Would you like to contact me or propose a contribution? Use the form below.",
      },
      footer: "Made with emotion for Africa",
    },
    fr: {
      title: "À propos",
      about: {
        title: "À propos du projet",
        text1: (
          <>
            Le <strong>Dictionnaire des Ethnies d'Afrique</strong> est un projet
            personnel dont l'objectif est de{" "}
            <strong>
              rendre accessibles et claires les informations sur les peuples
              d'Afrique
            </strong>
            .
          </>
        ),
        text2: (
          <>
            Avant les nations et les États, il y avait des ethnies, des peuples
            et des royaumes. L'histoire et les frontières les ont parfois
            effacés, mais ces peuples existent toujours et continuent de
            transmettre leurs langues, leurs cultures et leurs traditions.
          </>
        ),
        text3:
          "Aujourd'hui, je collecte progressivement les informations disponibles pour les organiser dans ce dictionnaire.",
        text4: (
          <>
            Le travail est long, car il est{" "}
            <strong>
              difficile de trouver des données fiables sur l'Afrique
            </strong>
            , mais le but est de centraliser ce savoir et de le rendre simple à
            consulter.
          </>
        ),
      },
      contribution: {
        title: "Contribution et participation",
        text1: (
          <>
            Pour le moment, le site est alimenté à partir de{" "}
            <strong>fichiers CSV</strong> regroupant les données sur les pays,
            les régions et les ethnies. Je continue à rechercher ces données et
            à les structurer au fur et à mesure.
          </>
        ),
        text2: (
          <>
            Je suis{" "}
            <strong>ouvert à toutes les propositions ou contributions</strong>,
            qu'il s'agisse de partager des fichiers CSV, des sources, des
            corrections, ou simplement des idées d'amélioration. Si vous
            souhaitez aider, n'hésitez pas à me contacter ou à proposer
            directement sur le{" "}
            <a
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              dépôt GitHub du projet
            </a>
            .
          </>
        ),
      },
      contact: {
        title: "Contact",
        text: "Vous souhaitez me contacter ou proposer une contribution ? Utilisez le formulaire ci-dessous.",
      },
      footer: "Fait avec émotion pour l'Afrique",
    },
    es: {
      title: "Acerca de",
      about: {
        title: "Acerca del proyecto",
        text1: (
          <>
            El <strong>Diccionario de los Pueblos de África</strong> es un
            proyecto personal cuyo objetivo es{" "}
            <strong>
              hacer que el conocimiento sobre África sea más claro y accesible
            </strong>
            .
          </>
        ),
        text2: (
          <>
            Antes de la creación de las naciones y los estados modernos,
            existían <strong>etnias, pueblos y reinos</strong>. La historia y
            las fronteras a veces los han borrado, pero estos pueblos siguen
            existiendo, transmitiendo sus lenguas, culturas y tradiciones.
          </>
        ),
        text3:
          "Actualmente estoy recopilando y organizando la información disponible para incluirla en este diccionario.",
        text4: (
          <>
            Es un trabajo largo y complejo, ya que es{" "}
            <strong>difícil encontrar datos fiables sobre África</strong>, pero
            la meta es reunir este conocimiento y presentarlo de forma sencilla.
          </>
        ),
      },
      contribution: {
        title: "Contribución y participación",
        text1: (
          <>
            Por ahora, el sitio se alimenta de <strong>archivos CSV</strong> que
            contienen datos sobre países, regiones y grupos étnicos. Sigo
            buscando y estructurando esta información poco a poco.
          </>
        ),
        text2: (
          <>
            Estoy{" "}
            <strong>abierto a todo tipo de propuestas y contribuciones</strong>,
            ya sea compartir archivos CSV, fuentes, correcciones o ideas para
            mejorar. Si quieres ayudar, puedes contactarme o contribuir
            directamente en el{" "}
            <a
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              repositorio de GitHub
            </a>
            .
          </>
        ),
      },
      contact: {
        title: "Contacto",
        text: "¿Deseas contactarme o proponer una contribución? Utiliza el formulario a continuación.",
      },
      footer: "Hecho con emoción para África",
    },
    pt: {
      title: "Sobre",
      about: {
        title: "Sobre o projeto",
        text1: (
          <>
            O <strong>Dicionário dos Povos da África</strong> é um projeto
            pessoal com o objetivo de{" "}
            <strong>
              tornar o conhecimento sobre a África mais claro e acessível
            </strong>
            .
          </>
        ),
        text2: (
          <>
            Antes da criação das nações e dos estados modernos, existiam{" "}
            <strong>etnias, povos e reinos</strong>. A história e as fronteiras,
            por vezes, os apagaram, mas esses povos ainda existem, preservando
            suas línguas, culturas e tradições.
          </>
        ),
        text3:
          "Atualmente, estou coletando e organizando informações disponíveis para incluí-las neste dicionário.",
        text4: (
          <>
            É um trabalho demorado, pois é{" "}
            <strong>difícil encontrar dados confiáveis sobre a África</strong>,
            mas a meta é reunir esse conhecimento e torná-lo fácil de explorar.
          </>
        ),
      },
      contribution: {
        title: "Contribuição e participação",
        text1: (
          <>
            Por enquanto, o site é alimentado por <strong>arquivos CSV</strong>{" "}
            com dados sobre países, regiões e grupos étnicos. Continuo
            pesquisando e estruturando essas informações com o tempo.
          </>
        ),
        text2: (
          <>
            Estou{" "}
            <strong>aberto a qualquer tipo de proposta ou contribuição</strong>,
            seja compartilhando arquivos CSV, fontes, correções ou ideias de
            melhoria. Se quiser ajudar, entre em contato comigo ou contribua
            diretamente no{" "}
            <a
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              repositório GitHub
            </a>
            .
          </>
        ),
      },
      contact: {
        title: "Contato",
        text: "Deseja entrar em contato comigo ou propor uma contribuição? Use o formulário abaixo.",
      },
      footer: "Feito com emoção para a África",
    },
  };

  const t = content[language];

  return (
    <PageLayout language={language} onLanguageChange={setLanguage}>
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-display font-bold">{t.title}</h1>

        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">{t.about.title}</h2>
          <p>{t.about.text1}</p>
          <p>{t.about.text2}</p>
          <p>{t.about.text3}</p>
          <p>{t.about.text4}</p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold">{t.contact.title}</h3>
          <p className="text-muted-foreground">{t.contact.text}</p>
          <div className="w-full">
            <div data-tf-live="01K9T08MHEFWHMK9NBWKE46DV6" />
          </div>
          <Script
            src="//embed.typeform.com/next/embed.js"
            strategy="lazyOnload"
          />
        </section>
      </div>
    </PageLayout>
  );
}
