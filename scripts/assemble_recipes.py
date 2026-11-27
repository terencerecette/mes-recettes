import json
import os
import re
import unicodedata

ALLOWED_CATEGORIES = ("Entrées", "Plats", "Desserts")
ALLOWED_UNITS = {
    "",
    "g",
    "kg",
    "ml",
    "cl",
    "L",
    "c. à soupe",
    "c. à café",
    "pièce(s)",
    "tranche(s)",
    "gousse(s)",
    "pincée",
    "sachet",
    "boîte",
    "botte",
    "branche(s)",
    "feuille(s)",
    "verre",
}

BATCH_FILES = [
    ("batch_1_entrees_froides.json", "Entrées", 84),
    ("batch_2_entrees_chaudes.json", "Entrées", 83),
    ("batch_3_plats_pates_four.json", "Plats", 84),
    ("batch_4_plats_quotidien.json", "Plats", 83),
    ("batch_5_desserts_gateaux.json", "Desserts", 83),
    ("batch_6_desserts_cremes.json", "Desserts", 83),
]


def normalize_title(title: str) -> str:
    s = title.lower().replace("œ", "oe").replace("æ", "ae")
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(root, "scripts", "data")
    out_path = os.path.join(root, "src", "data", "frigo_recipes.json")

    all_recipes = []
    seen_exact = {}
    seen_norm = {}
    duplicates = []

    for filename, expected_cat, expected_count in BATCH_FILES:
        path = os.path.join(data_dir, filename)
        with open(path, "r", encoding="utf-8") as f:
            items = json.load(f)

        print(f"{filename}: {len(items)} recettes (attendu {expected_count})")
        if len(items) != expected_count:
            raise SystemExit(
                f"ERREUR: {filename} contient {len(items)} recettes au lieu de {expected_count}"
            )

        for idx, item in enumerate(items):
            title = str(item["title"]).strip()
            cat = str(item["category"]).strip()
            if cat != expected_cat:
                raise SystemExit(
                    f"ERREUR: {filename}[{idx}] ({title}) a catégorie '{cat}' au lieu de '{expected_cat}'"
                )

            norm = normalize_title(title)
            if title in seen_exact:
                duplicates.append((filename, title, seen_exact[title]))
            elif norm in seen_norm:
                duplicates.append((filename, title, seen_norm[norm]))
            else:
                seen_exact[title] = filename
                seen_norm[norm] = f"{filename} ({title})"

            clean_ingredients = []
            for ing in item["ingredients"]:
                unit = str(ing.get("unit", "") or "").strip()
                if unit not in ALLOWED_UNITS:
                    raise SystemExit(
                        f"ERREUR: unité non autorisée '{unit}' dans {filename} -> {title}"
                    )
                qty = ing.get("quantity", None)
                if qty is not None:
                    qty = float(qty) if not float(qty).is_integer() else int(float(qty))
                clean_ingredients.append(
                    {
                        "quantity": qty,
                        "unit": unit,
                        "name": str(ing["name"]).strip(),
                    }
                )

            clean_steps = [str(s).strip() for s in item["steps"] if str(s).strip()]

            all_recipes.append(
                {
                    "title": title,
                    "category": cat,
                    "servings": int(item["servings"]),
                    "ingredients": clean_ingredients,
                    "steps": clean_steps,
                }
            )

    if duplicates:
        print("DOUBLONS DÉTECTÉS :")
        for dup in duplicates:
            print(" -", dup)
        raise SystemExit(1)

    # Attribution des IDs stables frigo-001 à frigo-500
    final_list = []
    counts = {c: 0 for c in ALLOWED_CATEGORIES}
    for idx, recipe in enumerate(all_recipes, start=1):
        counts[recipe["category"]] += 1
        final_list.append(
            {
                "id": f"frigo-{idx:03d}",
                **recipe,
            }
        )

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final_list, f, ensure_ascii=False, indent=2)

    print(
        f"OK: {len(final_list)} recettes écrites dans {out_path} -> {counts}"
    )


if __name__ == "__main__":
    main()
