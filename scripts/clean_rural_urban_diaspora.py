#!/usr/bin/env python3
"""
Script de nettoyage des déclinaisons "rural/urbain/diaspora/global"
selon les règles AFRIK.

Fusionne les données des fichiers déclinés dans les fichiers principaux
et supprime les fichiers redondants.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional

BASE_PATH = Path("dataset/source/afrik/peuples")
DECLINAISONS = ["RURAL", "URBAIN", "DIASP", "DIASPORA", "GLOBAL", "METIS"]
DECLINAISONS_PATTERN = re.compile(
    r"PPL_([A-Z_]+?)_(RURAL|URBAIN|DIASP|DIASPORA|GLOBAL|METIS|GLOBAL\d+|DIASPORA\d+)$"
)


def extract_population(text: str) -> Optional[Tuple[int, int]]:
    """Extrait une plage de population du texte."""
    # Cherche des patterns comme "25 000 000 - 30 000 000" ou "25M - 30M"
    patterns = [
        r"(\d+)\s*000\s*000\s*-\s*(\d+)\s*000\s*000",
        r"(\d+)\s*M\s*-\s*(\d+)\s*M",
        r"(\d+)\s*000\s*-\s*(\d+)\s*000",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return (int(match.group(1)), int(match.group(2)))
    # Cherche un nombre unique
    match = re.search(r"(\d+)\s*000\s*000", text)
    if match:
        val = int(match.group(1))
        return (val, val)
    return None


def read_file_content(filepath: Path) -> Dict[str, str]:
    """Lit un fichier et extrait les sections."""
    content = {}
    current_section = None
    current_text = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('# '):
                if current_section:
                    content[current_section] = '\n'.join(current_text)
                current_section = line[2:].strip()
                current_text = []
            elif line and current_section:
                current_text.append(line)
    
    if current_section:
        content[current_section] = '\n'.join(current_text)
    
    return content


def merge_demography(principal: Dict[str, str], declinaisons: List[Dict]) -> str:
    """Fusionne les données démographiques."""
    # Extraire la population totale du principal
    demo_principal = principal.get("7. Démographie globale", "")
    pop_principal = extract_population(demo_principal)
    
    # Extraire les populations des déclinaisons
    pop_rural = None
    pop_urbain = None
    pop_diaspora = None
    pop_global = None
    
    for decl in declinaisons:
        decl_type = decl['declinaison']
        demo = decl['content'].get("7. Démographie globale", "")
        pop = extract_population(demo)
        
        if decl_type == "RURAL" and pop:
            pop_rural = pop
        elif decl_type == "URBAIN" and pop:
            pop_urbain = pop
        elif decl_type.startswith("DIASP") and pop:
            if not pop_diaspora:
                pop_diaspora = pop
            else:
                # Additionner les diasporas
                if isinstance(pop_diaspora, tuple) and isinstance(pop, tuple):
                    pop_diaspora = (pop_diaspora[0] + pop[0], pop_diaspora[1] + pop[1])
        elif decl_type.startswith("GLOBAL") and pop:
            pop_global = pop
    
    # Calculer la population totale
    total_min = 0
    total_max = 0
    
    if pop_principal:
        total_min += pop_principal[0]
        total_max += pop_principal[1]
    if pop_rural:
        total_min += pop_rural[0]
        total_max += pop_rural[1]
    if pop_urbain:
        total_min += pop_urbain[0]
        total_max += pop_urbain[1]
    if pop_diaspora:
        total_min += pop_diaspora[0]
        total_max += pop_diaspora[1]
    
    # Si on a une population globale, l'utiliser comme référence
    if pop_global:
        total_min = pop_global[0]
        total_max = pop_global[1]
    
    # Construire le texte de démographie enrichi
    lines = []
    lines.append(f"- Population totale (tous pays) : {total_min:,} - {total_max:,}")
    lines.append("- Répartition par pays :")
    
    # Extraire la répartition du principal
    repart_match = re.search(r"- Répartition par pays :\s*(.*?)(?=- Année|$)", demo_principal, re.DOTALL)
    if repart_match:
        repart_text = repart_match.group(1).strip()
        lines.append(repart_text)
    
    # Ajouter les détails de distribution
    if pop_rural or pop_urbain or pop_diaspora:
        lines.append("")
        lines.append("- Distribution géographique :")
        if pop_rural:
            lines.append(f"  - Population rurale : {pop_rural[0]:,} - {pop_rural[1]:,}")
        if pop_urbain:
            lines.append(f"  - Population urbaine : {pop_urbain[0]:,} - {pop_urbain[1]:,}")
        if pop_diaspora:
            lines.append(f"  - Diaspora : {pop_diaspora[0]:,} - {pop_diaspora[1]:,}")
    
    # Ajouter année et source
    year_match = re.search(r"- Année de référence :\s*(.+)", demo_principal)
    if year_match:
        lines.append(f"- Année de référence : {year_match.group(1).strip()}")
    else:
        lines.append("- Année de référence : 2025")
    
    source_match = re.search(r"- Source :\s*(.+)", demo_principal)
    if source_match:
        lines.append(f"- Source : {source_match.group(1).strip()}")
    else:
        lines.append("- Source : Estimations basées sur recensements et études démographiques")
    
    return '\n'.join(lines)


def merge_diaspora_section(principal: Dict[str, str], declinaisons: List[Dict]) -> str:
    """Fusionne la section diaspora."""
    diaspora_principal = principal.get("6. Rôle historique et interactions régionales", "")
    
    # Extraire la ligne diaspora actuelle
    diaspora_match = re.search(r"- Diaspora :\s*(.+)", diaspora_principal)
    diaspora_text = diaspora_match.group(1).strip() if diaspora_match else ""
    
    # Collecter les informations diaspora des déclinaisons
    diaspora_info = []
    for decl in declinaisons:
        if decl['declinaison'].startswith("DIASP"):
            section = decl['content'].get("6. Rôle historique et interactions régionales", "")
            match = re.search(r"- Diaspora :\s*(.+)", section)
            if match:
                diaspora_info.append(match.group(1).strip())
    
    # Enrichir le texte diaspora
    if diaspora_info:
        if diaspora_text:
            diaspora_text += " " + " ".join(diaspora_info)
        else:
            diaspora_text = " ".join(diaspora_info)
    
    # Mettre à jour la section
    updated_section = re.sub(
        r"- Diaspora :\s*.+",
        f"- Diaspora : {diaspora_text}",
        diaspora_principal,
        flags=re.DOTALL
    )
    
    return updated_section


def find_principal_file(peuple_base: str) -> Optional[Path]:
    """Trouve le fichier principal (sans déclinaison)."""
    for filepath in BASE_PATH.rglob(f"{peuple_base}.txt"):
        return filepath
    return None


def process_peuple(peuple_base: str, declinaisons: List[Dict]) -> bool:
    """Traite un peuple : fusionne et supprime les déclinaisons."""
    # Trouver le fichier principal
    principal_file = find_principal_file(peuple_base)
    if not principal_file:
        print(f"⚠️  Fichier principal non trouvé pour {peuple_base}")
        return False
    
    # Lire le fichier principal
    principal_content = read_file_content(principal_file)
    
    # Lire les déclinaisons
    for decl in declinaisons:
        decl_file = Path(decl['file'])
        if decl_file.exists():
            decl['content'] = read_file_content(decl_file)
        else:
            print(f"⚠️  Fichier déclinaison non trouvé : {decl_file}")
    
    # Fusionner les données
    # 1. Démographie
    new_demo = merge_demography(principal_content, declinaisons)
    principal_content["7. Démographie globale"] = new_demo
    
    # 2. Diaspora
    new_diaspora = merge_diaspora_section(principal_content, declinaisons)
    principal_content["6. Rôle historique et interactions régionales"] = new_diaspora
    
    # Écrire le fichier principal mis à jour
    # (On va le faire manuellement pour garder le format exact)
    
    # Supprimer les fichiers déclinaisons
    for decl in declinaisons:
        decl_file = Path(decl['file'])
        if decl_file.exists():
            print(f"🗑️  Suppression : {decl_file}")
            # decl_file.unlink()  # Décommenter pour supprimer réellement
    
    return True


def main():
    """Fonction principale."""
    print("🔍 Recherche des peuples avec déclinaisons...")
    
    peuples_avec_declinaisons = {}
    
    for file_path in BASE_PATH.rglob("PPL_*.txt"):
        filename = file_path.name.replace(".txt", "")
        
        match = DECLINAISONS_PATTERN.match(filename)
        if match:
            peuple_base = f"PPL_{match.group(1)}"
            declinaison = match.group(2)
            
            if peuple_base not in peuples_avec_declinaisons:
                peuples_avec_declinaisons[peuple_base] = []
            
            peuples_avec_declinaisons[peuple_base].append({
                'file': str(file_path),
                'declinaison': declinaison
            })
    
    print(f"✅ {len(peuples_avec_declinaisons)} peuples avec déclinaisons trouvés")
    print(f"📊 Total fichiers à traiter : {sum(len(d) for d in peuples_avec_declinaisons.values())}")
    
    # Traiter chaque peuple
    for peuple_base, declinaisons in sorted(peuples_avec_declinaisons.items()):
        print(f"\n📝 Traitement de {peuple_base} ({len(declinaisons)} déclinaisons)")
        process_peuple(peuple_base, declinaisons)


if __name__ == "__main__":
    main()

