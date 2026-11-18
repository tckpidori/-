import sys, os, json, numpy as np, subprocess, struct
os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,'.')
from vec import vectorize
exec(open('world.py').read()); exec(open('names.py').read()); exec(open('names3.py').read())
B=json.load(open('build3.json')); K=B['K']; NPV=B['NPV']; NSP=B['NSP']; X0,X1,Y0,Y1=B['crop']
U2=np.load('U3.npy'); H2,W2=U2.shape; NCI=len(B['cities'])
LABEL={'Скифия Азиатская':'Скифия','Никополь Армянский':'Никополь','Лаодикея Сирийская':'Лаодикея'}
lab=lambda n: LABEL.get(n,n)
upv=np.array([g['pv'] for g in B['sp']]+[c['pv'] for c in B['cities']])
pdio=np.array([p['dio'] for p in PROV])
INDEP=['#d8ceb4','#c5d4bb','#dcc3b8','#bfd0d8','#d3c2d6','#cfd3a8','#c9c9c2','#e0cfa6','#b9d3c6','#dbbfc6','#c2cbe0','#d9d6b5','#c3d6ad']
realms={k:{'n':v[0],'c':v[1]} for k,v in REALMS.items()}; prealm=[]
for i,p in enumerate(PROV):
    rm=DIO[p['dio']]['realm']
    if rm is None: rm='I%d'%i; realms[rm]={'n':lab(p['n']),'c':INDEP[i%len(INDEP)],'ind':1}
    prealm.append(rm)
def deepest(lab_):
    Hh,Ww=lab_.shape
    b=(lab_!=np.roll(lab_,1,0))|(lab_!=np.roll(lab_,-1,0))|(lab_!=np.roll(lab_,1,1))|(lab_!=np.roll(lab_,-1,1))
    lab_.astype(np.int32).tofile('_cm.bin'); np.ones(lab_.shape,np.float32).tofile('_cost.bin')
    si,sj=np.nonzero(b&(lab_>=0))
    with open('_src.bin','wb') as fh:
        fh.write(struct.pack('i',len(si)))
        for i,j in zip(si.tolist(),sj.tolist()): fh.write(struct.pack('iif',i*Ww+j,0,1e9))
    subprocess.run(['./grow2',str(Ww),str(Hh),'0','0.000001','_cm.bin','_cost.bin','_src.bin','_own.bin','_dist.bin'],check=True)
    dist=np.fromfile('_dist.bin',dtype=np.float32).reshape(lab_.shape)
    for s in ('cm','cost','src','own','dist'): os.remove(f'_{s}.bin')
    m=lab_>=0; L=lab_[m]; D=dist[m]; idx=np.nonzero(m)
    order=np.lexsort((-D,L)); Ls=L[order]; first=np.r_[True,Ls[1:]!=Ls[:-1]]
    return {int(L[o]):[int(idx[1][o])*K,int(idx[0][o])*K,round(float(D[o])*K,1)] for o in order[first]}
Un=U2[::K,::K]
ua=deepest(Un)
PL=np.where(Un>=0,upv[np.maximum(Un,0)],-1); pa=deepest(PL); parea=np.bincount(PL[PL>=0],minlength=NPV)*K*K
DL=np.where(PL>=0,pdio[np.maximum(PL,0)],-1); da=deepest(DL); darea=np.bincount(DL[DL>=0],minlength=len(DIO))*K*K
rk=list(realms); rix={k:i for i,k in enumerate(rk)}
RE=np.where(PL>=0,np.array([rix[r] for r in prealm])[np.maximum(PL,0)],-1); rea=deepest(RE); earea=np.bincount(RE[RE>=0],minlength=len(rk))*K*K
uarea=np.bincount(U2[U2>=0],minlength=NSP+NCI)
enc,meta,rings=vectorize(U2,1.3)
G=np.load('../ck3/geo.npy',allow_pickle=True); fsrc,fw=G[0],G[1]
def U_(r2): return np.where(r2>0,r2*np.log(r2+1e-12),0.0)
def fwd(la,lo):
    X=np.stack([(np.asarray(lo,float)-15)/30,(np.asarray(la,float)-45)/15],1); n=len(fsrc)
    Kx=U_(((X[:,None]-fsrc[None])**2).sum(-1)); Q=np.hstack([np.ones((len(X),1)),X])
    o=np.stack([Kx@fw[j][:n]+Q@fw[j][n:] for j in range(2)],1); o[:,0]=(o[:,0]-X0)*K; o[:,1]=(o[:,1]-Y0)*K; return o
cidx={c['n']:i for i,c in enumerate(B['cities'])}
pl=[]
for n_,nm,t,col in PLAYERS:
    w=START[n_]
    if isinstance(w,str): a=ua[NSP+cidx[w]]; x,y=a[0],a[1]
    else:
        q=fwd([w[0]],[w[1]])[0]; x,y=float(q[0]),float(q[1]); i,j=int(y),int(x)
        if U2[i,j]<0:
            for rad in range(4,300,4):
                sub=U2[max(0,i-rad):i+rad+1,max(0,j-rad):j+rad+1]; c=np.argwhere(sub>=0)
                if len(c): b=c[((c-rad)**2).sum(1).argmin()]; y,x=float(max(0,i-rad)+b[0])+6,float(max(0,j-rad)+b[1]); break
    own=[i for i,p in enumerate(PROV) if p['p']==n_]; regs=[]
    for d in sorted({PROV[i]['dio'] for i in own}):
        allp=[i for i,p in enumerate(PROV) if p['dio']==d]
        if all(i in own for i in allp) and len(allp)>1: regs.append(DIO[d]['label'])
        else: regs+= [lab(PROV[i]['n']) for i in allp if i in own]
    pl.append({'n':n_,'name':nm,'title':t,'c':col,'x':round(x,1),'y':round(y,1),'secret':n_==6,
               'cr':(round(float(np.sqrt(uarea[NSP+cidx[w]]/np.pi)),1) if isinstance(w,str) else 0),'regions':regs})
SEAS=[('Атлантический океан',45.3,-8.2,1.5,-62),('Внутреннее море',35.4,18.0,2,0),('Понт Эвксинский',43.3,34.2,2,0),('Германское море',56.2,3.2,1,0),
 ('Свевское море',55.9,17.6,1,0),('Тирренское море',39.9,12.1,1,0),('Адриатическое море',43.1,15.5,1,-38),('Эгейское море',38.7,25.2,1,0),
 ('Каспийское море',41.8,50.6,1,-70),('Британский океан',49.8,-5.0,1,0),('Ливийское море',33.5,24.5,1,0),('Иберийское море',37.6,2.5,1,0),
 ('Персидский залив',27.9,50.8,1,-40),('Аравийский залив',25.2,36.2,1,-58)]
sp=fwd([s[1] for s in SEAS],[s[2] for s in SEAS])
seas=[{'n':s[0],'x':round(float(p[0]),1),'y':round(float(p[1]),1),'big':s[3],'rot':s[4]} for s,p in zip(SEAS,sp)]
for s_ in seas:
    if s_['n'].startswith('Атлант'): q=fwd([44.3],[-10.3])[0]; s_.update(x=round(float(q[0]),1),y=round(float(q[1]),1))
old=json.load(open('../v2/build2.json'))['sp']
gnames,fixed=small_names({'sp':B['ng']},PROV,NAMES,old,(1300,1430))
ROM=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
bygroup={}
for i,c in enumerate(B['sp']): bygroup.setdefault(c['g'],[]).append(i)
snames=[None]*len(B['sp'])
for g,ix in bygroup.items():
    if len(ix)==1: snames[ix[0]]=gnames[g]; continue
    ix.sort(key=lambda i:(round(B['sp'][i]['cy']/60),B['sp'][i]['cx']))        # numbered in reading order: north to south, west to east
    for k,i in enumerate(ix): snames[i]=f"{gnames[g]} {ROM[k] if k<len(ROM) else k+1}"
if fixed: print('auto-suffixed names:',fixed,file=sys.stderr)
RANK={1:'столица',2:'имперский центр',3:'крупный город',4:'город'}
units=[{'t':'p','n':snames[i],'pv':g['pv'],'a':ua.get(i),'A':int(uarea[i])} for i,g in enumerate(B['sp'])]
units+=[{'t':'c','n':lab(c['n']),'pv':c['pv'],'tier':c['t'],'rank':RANK[c['t']],'a':ua.get(NSP+i),'A':int(uarea[NSP+i])} for i,c in enumerate(B['cities'])]
provs=[{'n':lab(p['n']),'r':p['dio'],'realm':prealm[i],'p':p['p'],'a':pa.get(i),'A':int(parea[i])} for i,p in enumerate(PROV)]
dios=[{'ru':d['label'],'full':d['full'],'macro':MACRO[d['macro']],'rom':d['kind']=='R','a':da.get(i),'A':int(darea[i])} for i,d in enumerate(DIO)]
data={'W':W2,'H':H2,'NSP':NSP,'provs':provs,'arcs':enc,'meta':meta,'rings':{str(k):v for k,v in rings.items()},'units':units,'regions':dios,
 'realms':{k:dict(realms[k],a=rea.get(rix[k]),A=int(earea[rix[k]])) for k in rk},'players':pl,'seas':seas}
js='window.MAP='+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';'
open('data.js','w').write(js); print('data.js',len(js)//1024,'KB; arcs',len(enc),'units',len(units),file=sys.stderr)
def nbrs(i,ring):
    out=set()
    for ref in ring:
        l,r=meta[ref if ref>=0 else ~ref]; out|={l,r}
    out.discard(i); return out
bad=[]
for i,u in enumerate(units):
    if u['t']!='c': continue
    land_rings=[rg for rg in rings.get(i,[]) if any(n>=0 or n==-4 for n in nbrs(i,rg))]
    if len(land_rings)!=1: bad.append((u['n'],len(land_rings)))
print('cities with land holes or pieces:',bad,file=sys.stderr)
wet=[u['n'] for i,u in enumerate(units) if u['t']=='c' and any(n in (-9,-5,-3) for rg in rings.get(i,[]) for n in nbrs(i,rg))]
ports=[lab(c['n']) for c in CITIES if c['port']]
print('cities touching water:',len(wet),'| declared ports not on water:',[p for p in ports if p not in wet],file=sys.stderr)
print('units without shape:',[u['n'] for i,u in enumerate(units) if str(i) not in data['rings']],file=sys.stderr)
