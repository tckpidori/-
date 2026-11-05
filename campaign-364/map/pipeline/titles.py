import re, json, sys
K='/home/user/ck3src/The-Kingdom-of-Heaven/'
t=open(K+'common/landed_titles/00_landed_titles.txt',encoding='utf-8-sig',errors='replace').read()
t=re.sub(r'#[^\n]*','',t)
tok=re.findall(r'[A-Za-z0-9_\.\-]+|=|\{|\}|"[^"]*"',t)
stack=[]; bar={}  # barony title -> (province, county, duchy, kingdom, empire)
i=0; pending=None
while i<len(tok):
    w=tok[i]
    if w=='{':
        stack.append(pending); pending=None
    elif w=='}':
        stack.pop() if stack else None
    elif i+2<len(tok) and tok[i+1]=='=' and tok[i+2]=='{':
        pending=w; i+=1; continue
    elif w=='province' and i+2<len(tok) and tok[i+1]=='=':
        cur=[s for s in stack if s]
        b=[s for s in cur if s.startswith('b_')]
        if b:
            chain={p[:2]:s for s in cur for p in [s[:2]] if s[:2] in ('e_','k_','d_','c_','b_')}
            bar[int(tok[i+2])]={'b':chain.get('b_'),'c':chain.get('c_'),'d':chain.get('d_'),'k':chain.get('k_'),'e':chain.get('e_')}
        i+=3; continue
    i+=1
print('baronies',len(bar),'counties',len({v['c'] for v in bar.values()}),'duchies',len({v['d'] for v in bar.values()}),file=sys.stderr)
json.dump(bar,open('titles.json','w'))
for p in (496,2575,2065,1527): print(p,bar.get(p),file=sys.stderr)
