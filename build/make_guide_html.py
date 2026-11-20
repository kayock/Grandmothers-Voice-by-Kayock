#!/usr/bin/env python3
"""Generates the styled HTML user guide from the Markdown guide."""
import re, html as H, os

# Project root = the folder containing this build/ directory's parent.
# No absolute development paths — the project can be rebuilt anywhere.
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
md = open(f'{BASE}/Grandmothers_Voice_by_Kayock_User_Guide.md').read()

def inline(s):
    s = H.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', s)
    s = re.sub(r'\[([^\]]+)\]\(#([^)]+)\)', r'<a href="#\2">\1</a>', s)
    return s

out = []
in_table = False
for line in md.split('\n'):
    l = line.rstrip()
    if l.startswith('|'):
        cells = [c.strip() for c in l.strip('|').split('|')]
        if re.match(r'^[\s:|-]+$', l):
            continue
        if not in_table:
            out.append('<table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in cells) + '</tr></thead><tbody>')
            in_table = True
        else:
            out.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in cells) + '</tr>')
        continue
    if in_table:
        out.append('</tbody></table>')
        in_table = False
    if l.startswith('# '):
        out.append(f'<h1>{inline(l[2:])}</h1>')
    elif l.startswith('## '):
        out.append(f'<h2>{inline(l[3:])}</h2>')
    elif l.startswith('> '):
        out.append(f'<blockquote>{inline(l[2:])}</blockquote>')
    elif re.match(r'^\d+\. ', l):
        out.append(f'<p class="li">{inline(re.sub(r"^\\d+\\. ", "", l))}</p>')
    elif l.startswith('- '):
        out.append(f'<p class="li">• {inline(l[2:])}</p>')
    elif l.strip() == '---':
        out.append('<hr>')
    elif l.strip():
        out.append(f'<p>{inline(l)}</p>')
if in_table:
    out.append('</tbody></table>')

HTML = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kayock Legacy Builder User Guide</title>
<style>
:root{--bg:#100b1d;--panel:#181127;--ink:#f3edff;--muted:#c9badf;--line:#392a55;--purple:#9d6cff;--magenta:#e879f9;--cyan:#55d6ff}
*{box-sizing:border-box}
body{margin:0;font-family:"Segoe UI",Roboto,Arial,sans-serif;line-height:1.62;color:var(--ink);background:radial-gradient(circle at top left,#2b1946 0,transparent 40%),var(--bg)}
header{padding:44px 24px 30px;border-bottom:1px solid var(--line);background:linear-gradient(135deg,rgba(157,108,255,.20),rgba(232,121,249,.07))}
.inner{max-width:880px;margin:0 auto}
.kicker{color:var(--cyan);text-transform:uppercase;letter-spacing:.16em;font-weight:700;font-size:12px}
h1{font-size:clamp(28px,5vw,44px);margin:8px 0}
main{max-width:880px;margin:0 auto;padding:26px 24px 60px}
h2{color:#fff;border-bottom:1px solid var(--line);padding-bottom:8px;margin-top:34px;font-size:22px}
blockquote{border-left:4px solid var(--purple);margin:14px 0;padding:10px 16px;background:rgba(157,108,255,.10);border-radius:10px;color:var(--muted);font-style:italic}
code{background:rgba(0,0,0,.35);border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:.92em;font-family:Consolas,Menlo,monospace}
table{border-collapse:collapse;width:100%;margin:14px 0;font-size:14px}
th,td{border:1px solid var(--line);padding:8px 11px;text-align:left;vertical-align:top}
th{background:rgba(157,108,255,.14)}
p.li{margin:6px 0;padding-left:8px}
a{color:var(--cyan);text-decoration:none}
a:hover{text-decoration:underline}
hr{border:0;border-top:1px solid var(--line);margin:22px 0}
@media print{body{background:#fff;color:#222}header{background:#f0eaff;border-color:#ccc}h1,h2{color:#222}code{background:#f3f0fa;border-color:#ccc}th{background:#f0eaff;color:#222}blockquote,td,th{color:#222}a{color:#333}}
</style></head><body>
<header><div class="inner"><div class="kicker">Kayock Legacy Builder 2.0 · offline Family Legacy Studio</div>
<h1>User Guide</h1></div></header>
<main>
""" + '\n'.join(out) + """
<p style="margin-top:34px;color:var(--muted);font-size:13px">Kayock Legacy Builder 2.0 — MIT License. Runs fully offline. Your original GED file is never modified.</p>
</main></body></html>"""

open(f'{BASE}/Grandmothers_Voice_by_Kayock_User_Guide.html', 'w').write(HTML)
print('guide html written:', len(HTML), 'chars')
