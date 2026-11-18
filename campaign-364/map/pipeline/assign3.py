import sys, os, json, re, csv, numpy as np, unicodedata
os.chdir(os.path.dirname(os.path.abspath(__file__)))
exec(open('world.py').read())
CK='../ck3/'; KD='/home/user/ck3src/The-Kingdom-of-Heaven/'
X0,X1,Y0,Y1=380,4050,680,3160
pid=np.load(CK+'pid.npy')[Y0:Y1,X0:X1]; H,W=pid.shape
bar={int(k):v for k,v in json.load(open(CK+'titles.json')).items()}
rows=[r for r in csv.reader(open(KD+'map_data/definition.csv',encoding='utf-8-sig',errors='replace'),delimiter=';') if r and r[0].strip().isdigit()]
names={int(r[0]):r[4] for r in rows}
G=np.load(CK+'geo.npy',allow_pickle=True); fsrc,fw,isrc,iw=G
def U_(r2): return np.where(r2>0,r2*np.log(r2+1e-12),0.0)
def tps(src,w,X):
    n=len(src); out=[]
    for s in range(0,len(X),20000):
        x=X[s:s+20000]; Kx=U_(((x[:,None]-src[None])**2).sum(-1)); Q=np.hstack([np.ones((len(x),1)),x])
        out.append(np.stack([Kx@w[j][:n]+Q@w[j][n:] for j in range(w.shape[0])],1))
    return np.concatenate(out)
fwd=lambda la,lo: tps(fsrc,fw,np.stack([(np.asarray(lo,float)-15)/30,(np.asarray(la,float)-45)/15],1))
inv=lambda x,y: tps(isrc,iw,np.stack([(np.asarray(x,float)-2000)/1000,(np.asarray(y,float)-1900)/1000],1))
F=json.load(open('frame.json')); RS,RL0,RB1=F['S'],F['L0'],F['B1']; reg=np.load('reg3.npy'); RH,RW=reg.shape
mx=int(pid.max())+1
isbar=np.zeros(mx,bool); isbar[[k for k in bar if k<mx]]=True
def kind(p):
    if p in bar: return 'l'
    n=names.get(p,'').lower()
    if n.startswith('river_'): return 'r'
    if n.startswith('sea_') or 'ocean' in n or 'atlantic' in n or n.endswith(' ti') or 'sea' in n: return 's'
    if 'lake' in n: return 'k'
    return 'w'
ids=[int(p) for p in np.unique(pid)]
issea=np.zeros(mx,bool); issea[[p for p in ids if kind(p)=='s']]=True
# ---- county votes ----
ys,xs=np.nonzero(isbar[pid][::3,::3]); ys*=3; xs*=3
ll=inv(xs+X0+.5,ys+Y0+.5)
ri=((RB1-ll[:,0])/RS).astype(int); rj=((ll[:,1]-RL0)/RS).astype(int)
ok=(ri>=0)&(ri<RH)&(rj>=0)&(rj<RW); rv=np.full(len(ys),-1); rv[ok]=reg[ri[ok],rj[ok]]
from collections import defaultdict, Counter
votes=defaultdict(Counter)
for p,v in zip(pid[ys,xs].tolist(),rv.tolist()): votes[bar[p]['c']][v]+=1
creg={}
for c,cn in votes.items():
    tot=sum(cn.values()); good={k:v for k,v in cn.items() if k>=0}
    creg[c]=max(good,key=good.get) if good and max(good.values())>=0.25*tot else -1
# ---- barony geometry ----
flat=pid.ravel(); cnt=np.bincount(flat,minlength=mx).astype(float)
yy,xx=np.indices(pid.shape)
bcx=np.bincount(flat,weights=xx.ravel(),minlength=mx)/np.maximum(cnt,1); bcy=np.bincount(flat,weights=yy.ravel(),minlength=mx)/np.maximum(cnt,1)
S_=issea[pid]; nearsea=np.roll(S_,1,0)|np.roll(S_,-1,0)|np.roll(S_,1,1)|np.roll(S_,-1,1)
coastal=np.zeros(mx,bool); coastal[np.unique(pid[nearsea&isbar[pid]])]=True
land_b=np.array([p for p in ids if p in bar])
def norm(s): return ''.join(ch for ch in unicodedata.normalize('NFKD',s or '') if not unicodedata.combining(ch)).lower().replace('-',' ').replace("'",'').replace('_',' ').strip()
bkey=defaultdict(list)
for p in land_b.tolist():
    for nm in {norm(bar[p]['b'][2:]),norm(names.get(p,''))}:
        if nm: bkey[nm].append(p)
FIX={'Никомедия':741,'Никея':750,'Аквы Секстиевы':2023,'Эбуродун':2027,'Мира':5645,'Афродисиада':5650,'Гангра':5580,'Пессинунт':5563,
 'Никополь Армянский':5701,'Петра':5971,'Аназарб':5625,'Нахчиван':5785,'Кабала':5774,'Шемаха':669,'Никопсия':600,'Херсонес':560,'Аквилея':2507,
 'Рев-Ардашир':4301,'Петродава':5031,'Ольвия':542,'Аршамашат':5707,'Нпркерт':4859,'Тигранакерт':4858,'Амида':4867,'Амоль':4312,
 'Антиохия Писидии':5661,'Лаодикея':748,'Пайтакаран':5790,'Питиунт':5744,'Себастополис':5746,'Фасис':5754}
taken={}; cityb={}; rep=[]
order=sorted(range(len(CITIES)),key=lambda i:(CITIES[i]['t'],i))
pts=fwd([c['lat'] for c in CITIES],[c['lon'] for c in CITIES]); pts[:,0]-=X0; pts[:,1]-=Y0
inframe=set(land_b.tolist())
for i in order:
    c=CITIES[i]; qx,qy=pts[i]
    if c['n'] in FIX and FIX[c['n']] in inframe and FIX[c['n']] not in taken:
        p=FIX[c['n']]; taken[p]=i; cityb[c['n']]=p; rep.append((c['n'],'вручную',bar[p]['b'][2:],round(float(np.hypot(bcx[p]-qx,bcy[p]-qy)),0),'')); continue
    if not(0<=qx<W and 0<=qy<H): rep.append((c['n'],'ВНЕ КАРТЫ','','','')); continue
    d=np.hypot(bcx[land_b]-qx,bcy[land_b]-qy)
    al=[p for a in c['al'].split('|') if a for p in bkey.get(norm(a),[]) if np.hypot(bcx[p]-qx,bcy[p]-qy)<110]
    al=sorted(set(al),key=lambda p:np.hypot(bcx[p]-qx,bcy[p]-qy))
    near=land_b[np.argsort(d)][:40].tolist()
    here=int(pid[int(qy),int(qx)])
    if here in bar: near=[here]+[p for p in near if p!=here]
    if c['port']: near=[p for p in near if coastal[p]]+[p for p in near if not coastal[p]]
    cand=[(p,'имя') for p in al]+[(p,'координаты') for p in near if p not in al]
    p,how=[t for t in cand if t[0] not in taken][0]
    taken[p]=i; cityb[c['n']]=p
    rep.append((c['n'],how,bar[p]['b'][2:],round(float(np.hypot(bcx[p]-qx,bcy[p]-qy)),0),'' if (not c['port'] or coastal[p]) else 'ПОРТ НЕ У МОРЯ'))
# counties: a county with cities of one province follows it; a county with cities of several provinces is split by nearest city
bycounty=defaultdict(list)
for nm,p in cityb.items(): bycounty[bar[p]['c']].append((p,[c['pv'] for c in CITIES if c['n']==nm][0]))
bcounty={}; split=[]
for cty,lst in bycounty.items():
    pvs={pv for _,pv in lst}
    if len(pvs)==1: creg[cty]=lst[0][1]; continue
    split.append(cty)
    for p in [q for q in land_b.tolist() if bar[q]['c']==cty]:
        k=min(lst,key=lambda t:np.hypot(bcx[t[0]]-bcx[p],bcy[t[0]]-bcy[p]))
        bcounty[p]=f"{cty}#{k[1]}"; creg[bcounty[p]]=k[1]
print('counties split between provinces:',[c[2:] for c in split])
json.dump({'creg':creg,'cityb':cityb,'bcounty':{str(k):v for k,v in bcounty.items()},'crop':[X0,X1,Y0,Y1]},open('assign3.json','w'),ensure_ascii=False)
print('counties',len(creg),'assigned',sum(1 for v in creg.values() if v>=0),'| cities placed',len(cityb),'of',len(CITIES))
print('by name:',sum(1 for r in rep if r[1]=='имя'),'manual:',sum(1 for r in rep if r[1]=='вручную'),'by coordinates:',sum(1 for r in rep if r[1]=='координаты'),'off map:',[r[0] for r in rep if r[1]=='ВНЕ КАРТЫ'])
print('ports not on the sea:',[r[0] for r in rep if r[4]=='ПОРТ НЕ У МОРЯ'])
open('assign3.txt','w').write('\n'.join(' | '.join(map(str,r)) for r in rep))
for nm,la,lo in [('Istakhr',29.98,52.91),('Siraf',27.67,52.34),('Berenice',23.91,35.47),('Garama',26.55,13.06),('Hegra',26.79,37.95),('Saratov',51.5,46.0),('Amol',36.47,52.35),('Orkney',58.9,-3.1)]:
    q=fwd([la],[lo])[0]; print(f'{nm}: x {q[0]-X0:.0f}/{W}  y {q[1]-Y0:.0f}/{H}')
