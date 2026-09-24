#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 || $# -gt 5 ]]; then
  echo "Usage: $0 <flavor-id> <school-slug> <application-id> <school-name> [location]"
  echo 'Example: ./tools/create-school.sh stjoseph st-joseph com.schooldb.support.stjoseph "St Joseph School" "Hyderabad"'
  exit 1
fi

flavor_id="$1"
school_slug="$2"
application_id="$3"
school_name="$4"
location="${5:-}"

[[ "$flavor_id" =~ ^[a-z][a-z0-9]*$ ]] || { echo "Invalid flavor id."; exit 1; }
[[ "$school_slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "Invalid school slug."; exit 1; }
[[ "$application_id" =~ ^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$ ]] || { echo "Invalid application id."; exit 1; }
! grep -q "^${flavor_id}\\.applicationId=" schools.properties || { echo "Flavor already exists."; exit 1; }

short_name=$(printf '%s' "$school_name" | tr '[:lower:]' '[:upper:]')
support_label="${short_name} SUPPORT"

python3 - "$flavor_id" <<'PY'
from pathlib import Path
import sys
path = Path("schools.properties")
text = path.read_text()
flavor = sys.argv[1]
for line in text.splitlines():
    if line.startswith("schools="):
        values = [x.strip() for x in line.split("=", 1)[1].split(",") if x.strip()]
        text = text.replace(line, "schools=" + ",".join(values + [flavor]), 1)
        break
else:
    raise SystemExit("Missing schools= in schools.properties")
path.write_text(text)
PY

cat >> schools.properties <<EOF

${flavor_id}.applicationId=${application_id}
${flavor_id}.schoolSlug=${school_slug}
${flavor_id}.schoolName=${school_name}
${flavor_id}.shortName=${short_name}
${flavor_id}.location=${location}
${flavor_id}.supportLabel=${support_label}
${flavor_id}.appName=${school_name}
${flavor_id}.primaryColor=0xFF235A8C
${flavor_id}.secondaryColor=0xFF2E7D4F
${flavor_id}.accentColor=0xFFE0A62B
${flavor_id}.dangerColor=0xFFC7352E
EOF

resource_dir="app/src/${flavor_id}/res"
mkdir -p "$resource_dir/drawable" "$resource_dir/drawable-nodpi"
cp app/src/main/res/drawable-nodpi/schooldb_logo.png "$resource_dir/drawable-nodpi/school_logo.png"
cp app/src/main/res/drawable/brand_logo.xml "$resource_dir/drawable/brand_logo.xml"
cp app/src/main/res/drawable/brand_launcher_foreground.xml "$resource_dir/drawable/brand_launcher_foreground.xml"
sed -i.bak 's|@drawable/schooldb_logo|@drawable/school_logo|g' "$resource_dir/drawable/brand_logo.xml" "$resource_dir/drawable/brand_launcher_foreground.xml"
rm "$resource_dir/drawable/brand_logo.xml.bak" "$resource_dir/drawable/brand_launcher_foreground.xml.bak"

variant="$(tr '[:lower:]' '[:upper:]' <<< "${flavor_id:0:1}")${flavor_id:1}"
echo "Created $flavor_id. Replace the placeholder logo, add app/src/$flavor_id/google-services.json, then build :app:assemble${variant}Debug."
