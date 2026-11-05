import sys, os, json, numpy as np, subprocess, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vec import vectorize
exec(open('regions_all.py').read())
U=np.load('U.npy'); H,W=U.shape; B=json.load(open('build.json')); NP=B['NP']; X0,X1,Y0,Y1=B['crop']
NC=len(B['cities'])
ureg=np.array([p['r'] for p in B['prov']]+[c['r'] for c in B['cities']])
# ---- realms and players per region ----
REALM_OF={'W':'ROM','E':'ROM'}
REALMS={'ROM':('Римская империя','#8a2f86'),'ALAM':('Алеманны','#c99a6b'),'FRANC':('Франки','#b98a8a'),'TERV':('Тервинги','#8fb1d6'),
 'GREU':('Грейтунги','#7f9fcf'),'HUNS':('Гунны','#8c8a86'),'PERS':('Держава Сасанидов','#e9a46a'),'ARM':('Армения','#d8c9e8'),'MAUR':('Мавры Нубеля','#d9c45a'),
 'MUMU':('Муму','#8cc39a')}
INDEP_COL=['#cfd6c4','#d9cbbd','#c9d3dc','#dccfd8','#d3d8c6','#d6cdc0','#c8d6d3','#dad3c2','#cdd0de','#d8c8c8']
realm_of={}
for r,R_ in enumerate(REGALL):
    n,f=R_[0],R_[1]
    if f in REALM_OF: realm_of[r]='ROM'
    elif n=='Alamannia': realm_of[r]='ALAM'
    elif n=='Francia': realm_of[r]='FRANC'
    elif n=='Gothia': realm_of[r]='TERV'
    elif n=='Oium': realm_of[r]='GREU'
    elif n=='Hunni': realm_of[r]='HUNS'
    elif f=='P': realm_of[r]='PERS'
    elif n=='Armenia': realm_of[r]='ARM'
    elif n=='Mauri': realm_of[r]='MAUR'
    elif n=='Mumu': realm_of[r]='MUMU'
    else:
        key='I_'+n; REALMS[key]=(RU[n],INDEP_COL[len([k for k in REALMS if k.startswith('I_')])%len(INDEP_COL)]); realm_of[r]=key
PLAYERS=[(1,'Валентиниан','Augustus, император Запада','#c0392b'),(2,'Иовин','Magister Equitum per Gallias','#e2735f'),(3,'Феодосий','Comes Hispaniarum','#a0522d'),
 (4,'Валент','Augustus, император Востока','#7d3c98'),(5,'Лупицин','Magister Equitum per Orientem','#b07cc6'),(6,'Прокопий','Usurpator','#5b2c6f'),
 (7,'Макриан','Rex Alamannorum','#8d5a2b'),(8,'Маллобауд','Rex Francorum','#b8860b'),(9,'Эрманарих','Rex Gothorum (гревтунги)','#2e86c1'),
 (10,'Атанарих','Iudex Tervingorum','#5dade2'),(11,'Баламбер','Rex Hunnorum','#2c2c2c'),(12,'Шапур II','Šāhān šāh','#e67e22'),
 (13,'Аршак II','Thagavor Hayots','#f2f2f2'),(14,'Нубель','Regulus Maurorum','#d4ac0d'),(15,'Кримтанн мак Фидах','Rí Érenn','#27ae60')]
CTRL={1:['Venetia et Istria','Aemilia et Liguria','Raetia','Flaminia et Picenum','Etruria et Umbria','Samnium et Campania','Apulia et Calabria','Bruttia et Lucania',
   'Sicilia','Sardinia','Corsica','Noricum','Pannonia','Dalmatia','Dardania','Dacia*','Epirus','Macedonia','Achaea','Africae Proconsularis','Numidia','Tripolitania','Mauretania'],
 2:['Maxima Caesariensis','Flavia Caesariensis','Britannia Prima','Britannia Secunda','Germania Secunda','Germania Prima','Belgica','Gallia Lugdunensis','Maxima Sequanorum',
   'Aquitanica','Narbonnensis','Viennensis'],
 3:['Tarraconensis','Carthaginiensis','Baetica','Lusitania','Gallaecia','Baleares'],
 4:['Thracia','Moesia','Asia','Paphlagonia','Galatia','Creta'],
 5:['Cappadocia','Cilicia','Syria','Iudaea','Arabia','Mesopotamia','Aegyptus','Cyrenaica','Cyprus'],
 7:['Alamannia'],8:['Francia'],9:['Oium'],10:['Gothia'],11:['Hunni'],12:['Asoristan','Adiabene','Media','Atropatene','Susiana','Lakhmidae'],13:['Armenia'],14:['Mauri'],15:['Mumu']}
player_of={}
for n_,lst in CTRL.items():
    for nm in lst: player_of[[i for i,R_ in enumerate(REGALL) if R_[0]==nm][0]]=n_
# ---- label anchors: deepest interior point ----
def deepest(lab):
    b=(lab!=np.roll(lab,1,0))|(lab!=np.roll(lab,-1,0))|(lab!=np.roll(lab,1,1))|(lab!=np.roll(lab,-1,1))
    lab.astype(np.int32).tofile('_cm.bin'); np.ones(lab.shape,np.float32).tofile('_cost.bin')
    si,sj=np.nonzero(b&(lab>=0))
    with open('_src.bin','wb') as fh:
        fh.write(struct.pack('i',len(si)))
        for i,j in zip(si.tolist(),sj.tolist()): fh.write(struct.pack('iif',i*W+j,0,1e9))
    subprocess.run(['./grow2',str(W),str(H),'0','0.000001','_cm.bin','_cost.bin','_src.bin','_own.bin','_dist.bin'],check=True)
    dist=np.fromfile('_dist.bin',dtype=np.float32).reshape(lab.shape)
    for s in ('cm','cost','src','own','dist'): os.remove(f'_{s}.bin')
    m=lab>=0; L=lab[m]; D=dist[m]; idx=np.nonzero(m)
    order=np.lexsort((-D,L)); Ls=L[order]; first=np.r_[True,Ls[1:]!=Ls[:-1]]
    return {int(L[o]):[int(idx[1][o]),int(idx[0][o]),round(float(D[o]),1)] for o in order[first]}
ua=deepest(U)
RL=np.where(U>=0,ureg[np.maximum(U,0)],-1); ra=deepest(RL)
rk=sorted(REALMS); rix={k:i for i,k in enumerate(rk)}
RE=np.where(RL>=0,np.array([rix[realm_of[r]] for r in range(len(REGALL))])[np.maximum(RL,0)],-1); rea=deepest(RE)
uarea=np.bincount(U[U>=0],minlength=NP+NC); rarea=np.bincount(RL[RL>=0],minlength=len(REGALL)); earea=np.bincount(RE[RE>=0],minlength=len(rk))
# ---- vectors ----
enc,meta,rings=vectorize(U,0.9)
# ---- georef for markers, seas, rivers ----
G=np.load('geo.npy',allow_pickle=True); fsrc,fw=G[0],G[1]
def U_(r2): return np.where(r2>0,r2*np.log(r2+1e-12),0.0)
def fwd(la,lo):
    X=np.stack([(np.asarray(lo,float)-15)/30,(np.asarray(la,float)-45)/15],1); n=len(fsrc); out=[]
    for s in range(0,len(X),20000):
        x=X[s:s+20000]; Kx=U_(((x[:,None]-fsrc[None])**2).sum(-1)); Q=np.hstack([np.ones((len(x),1)),x])
        out.append(np.stack([Kx@fw[j][:n]+Q@fw[j][n:] for j in range(2)],1))
    o=np.concatenate(out); o[:,0]-=X0; o[:,1]-=Y0; return o
cityidx={c['n']:i for i,c in enumerate(B['cities'])}
START={1:'Mediolanum',2:'Augusta Treverorum',3:'Emerita Augusta',4:'Nova Roma',5:(36.2,36.16),6:(44.61,33.49),7:'Cannstatt',8:(51.75,6.6),9:(48.5,35.1),
 10:(44.9,26.1),11:(46.4,47.9),12:(33.1,44.58),13:(40.0,44.58),14:'Iol Caesarea',15:(52.52,-7.89)}
pl=[]
for n_,nm,t,col in PLAYERS:
    w=START[n_]
    if isinstance(w,str): u=NP+cityidx[w]; x,y=ua[u][0],ua[u][1]
    else: q=fwd([w[0]],[w[1]])[0]; x,y=float(q[0]),float(q[1])
    pl.append({'n':n_,'name':nm,'title':t,'c':col,'x':round(x,1),'y':round(y,1),'secret':n_==6,'regions':[RU[REGALL[r][0]] for r,p in player_of.items() if p==n_]})
SEAS=[('Атлантический океан',45.2,-8.6,1),('Внутреннее море',35.6,17.8,1),('Понт Эвксинский',43.3,34.2,1),('Германское море',56.0,3.0,0),('Свевское море',55.8,17.5,0),
 ('Тирренское море',39.8,12.0,0),('Адриатическое море',43.0,15.6,0),('Эгейское море',38.6,25.1,0),('Каспийское море',41.8,50.5,0),('Британский океан',49.7,-5.5,0),('Ливийское море',33.4,24.5,0)]
sp=fwd([s[1] for s in SEAS],[s[2] for s in SEAS])
seas=[{'n':s[0],'x':round(float(p[0]),1),'y':round(float(p[1]),1),'big':s[3],'rot':0} for s,p in zip(SEAS,sp)]
for s_ in seas:
    if s_['n'].startswith('Атлант'): s_.update(x=300.0,y=1065.0,rot=-42,fs=34)
riv=json.load(open('/home/user/nvkelso/natural-earth-vector/geojson/ne_50m_rivers_lake_centerlines.geojson'))
rl=[]
for ft in riv['features']:
    nm=ft['properties'].get('name_en') or ft['properties'].get('name')
    if nm not in ('Nile','Euphrates','Tigris','Orontes','Jordan','Ebro','Tagus','Tajo','Duero','Guadiana','Tiber','Arno','Maritsa','Vardar','Sava','Drava','Tisza','Morava','Moselle','Main','Weser','Oder','Kura','Aras','Halys','Kızılırmak','Sakarya','Kuban','Terek','Dniester','Prut','Siret','Olt','Southern Bug','Neman','Daugava'): continue
    g=ft['geometry']
    for ln in (g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]):
        a=np.array(ln); p=fwd(a[:,1],a[:,0])
        ok=(p[:,0]>-50)&(p[:,0]<W+50)&(p[:,1]>-50)&(p[:,1]<H+50)
        if ok.sum()>=2: rl.append([round(v,1) for xy in p[ok] for v in xy])
data={'W':W,'H':H,'NP':NP,'arcs':enc,'meta':meta,'rings':{str(k):v for k,v in rings.items()},
 'units':[{'r':int(ureg[u]),'n':(B['prov'][u]['d'] if u<NP else B['cities'][u-NP]['n']),'b':(None if u<NP else B['cities'][u-NP]['b']),'a':ua.get(u),'A':int(uarea[u])} for u in range(NP+NC)],
 'regions':[{'la':R_[0],'ru':RU[R_[0]],'f':R_[1],'realm':realm_of[r],'p':player_of.get(r,0),'a':ra.get(r),'A':int(rarea[r])} for r,R_ in enumerate(REGALL)],
 'realms':{k:{'n':REALMS[k][0],'c':REALMS[k][1],'a':rea.get(rix[k]),'A':int(earea[rix[k]])} for k in rk},
 'players':pl,'seas':seas,'rivers':rl}
js='window.MAP='+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';'
open('data.js','w').write(js); print('data.js',len(js)//1024,'KB; arcs',len(enc),'river lines',len(rl),file=sys.stderr)
