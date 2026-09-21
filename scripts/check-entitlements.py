import base64, json, subprocess, time, urllib.request, urllib.error, os, sys

KEY = os.path.expanduser("~/.appstoreconnect/private_keys/AuthKey_P8G4THGFGZ.p8")
KID, ISS = "P8G4THGFGZ", "3ecb59f2-287c-494e-b451-a288cb57158d"
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=")

now = int(time.time())
si = b64(json.dumps({"alg":"ES256","kid":KID,"typ":"JWT"},separators=(',',':')).encode()) + b"." \
   + b64(json.dumps({"iss":ISS,"iat":now,"exp":now+1200,"aud":"appstoreconnect-v1"},separators=(',',':')).encode())
der = subprocess.run(["openssl","dgst","-sha256","-sign",KEY], input=si, capture_output=True).stdout

def unpack(d):
    i = 2 if d[1] < 0x80 else 2 + (d[1] & 0x7f)
    out = []
    for _ in range(2):
        ln = d[i+1]; out.append(d[i+2:i+2+ln].lstrip(b"\x00").rjust(32, b"\x00")); i += 2 + ln
    return b"".join(out)

TOKEN = (si + b"." + b64(unpack(der))).decode()

def get(path):
    req = urllib.request.Request("https://api.appstoreconnect.apple.com" + path,
                                 headers={"Authorization": "Bearer " + TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:300]}"); sys.exit(1)

for bid in ("com.nutria25.noreel", "com.nutria25.reelsfree"):
    res = get(f"/v1/bundleIds?filter[identifier]={bid}&limit=1")
    data = res.get("data", [])
    if not data:
        print(f"{bid} : non enregistre"); continue
    rid = data[0]["id"]
    caps = get(f"/v1/bundleIds/{rid}/bundleIdCapabilities")
    names = sorted(c["attributes"]["capabilityType"] for c in caps.get("data", []))
    fam = [n for n in names if "FAMILY" in n.upper()]
    # ATTENTION : l'API publique ne connait PAS le type FAMILY_CONTROLS
    # (absent de son enum). C'est une "managed capability". Ce script ne peut
    # donc pas confirmer son activation : seul le mail d'Apple et un build
    # reussi font foi.
    print(f"\n{bid}")
    print(f"  capacites actives : {', '.join(names) if names else '(aucune)'}")
    print(f"  FAMILY_CONTROLS   : {'visible' if fam else 'non visible via l API (normal)'}")
