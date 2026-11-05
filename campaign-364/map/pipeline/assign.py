import sys, os, json, re, csv, numpy as np, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open('regions_all.py').read())
K='/home/user/ck3src/The-Kingdom-of-Heaven/'
X0,X1,Y0,Y1=380,3800,680,3080
pid=np.load('pid.npy')[Y0:Y1,X0:X1]; H,W=pid.shape
bar={int(k):v for k,v in json.load(open('titles.json')).items()}
rows=[r for r in csv.reader(open(K+'map_data/definition.csv',encoding='utf-8-sig',errors='replace'),delimiter=';') if r and r[0].strip().isdigit()]
names={int(r[0]):r[4] for r in rows}
G=np.load('geo.npy',allow_pickle=True); fsrc,fw,isrc,iw=G
def U_(r2): return np.where(r2>0,r2*np.log(r2+1e-12),0.0)
def tps(src,w,X):
    n=len(src); out=[]
    for s in range(0,len(X),20000):
        x=X[s:s+20000]; Kx=U_(((x[:,None]-src[None])**2).sum(-1)); Q=np.hstack([np.ones((len(x),1)),x])
        out.append(np.stack([Kx@w[j][:n]+Q@w[j][n:] for j in range(w.shape[0])],1))
    return np.concatenate(out)
fwd=lambda la,lo: tps(fsrc,fw,np.stack([(np.asarray(lo)-15)/30,(np.asarray(la)-45)/15],1))
inv=lambda x,y: tps(isrc,iw,np.stack([(np.asarray(x)-2000)/1000,(np.asarray(y)-1900)/1000],1))
# region raster (real coords)
F=json.load(open('frame.json')); RS,RL0,RB1=F['S'],F['L0'],F['B1']; reg=np.load('reg_all.npy'); RH,RW=reg.shape
# sample land baronies
isbar=np.zeros(pid.max()+1,bool); isbar[list(k for k in bar if k<=pid.max())]=True
ys,xs=np.nonzero(isbar[pid][::3,::3]); ys*=3; xs*=3
ll=inv(xs+X0+.5,ys+Y0+.5)
ri=((RB1-ll[:,0])/RS).astype(int); rj=((ll[:,1]-RL0)/RS).astype(int)
ok=(ri>=0)&(ri<RH)&(rj>=0)&(rj<RW)
rv=np.full(len(ys),-1); rv[ok]=reg[ri[ok],rj[ok]]
# county votes
cty=[bar[int(p)]['c'] for p in pid[ys,xs]]
from collections import defaultdict, Counter
votes=defaultdict(Counter)
for c,v in zip(cty,rv.tolist()): votes[c][v]+=1
creg={}
for c,cn in votes.items():
    tot=sum(cn.values()); good={k:v for k,v in cn.items() if k>=0}
    if good and max(good.values())>=0.25*tot: creg[c]=max(good,key=good.get)
    else: creg[c]=-1
# cities -> barony: by name, else by georef point
def norm(s): return ''.join(ch for ch in unicodedata.normalize('NFKD',s or '') if not unicodedata.combining(ch)).lower().replace('-',' ').replace("'",'').replace('_',' ').strip()
bkey={}
for p,v in bar.items():
    for nm in (v['b'][2:].replace('_',' '), names.get(p,'')):
        bkey.setdefault(norm(nm),[]).append(p)
ALIAS={'Londinium':'london','Dubris':'dover','Lindum':'lincoln','Corinium':'cirencester|gloucester','Eboracum':'york|jorvik','Colonia Agrippina':'koln|cologne|koeln',
'Mogontiacum':'mainz','Argentoratum':'strassburg|strasbourg|argentoratum','Bononia':'boulogne','Augusta Treverorum':'trier','Durocortorum':'reims','Rotomagus':'rouen',
'Caesarodunum Turonum':'tours','Portus Namnetum':'nantes','Lugdunum':'lyon','Vindonissa':'windisch|brugg|aarau|baden','Aventicum':'avenches','Avaricum':'bourges',
'Burdigala':'bordeaux','Elusa':'eauze|auch','Narbo Martius':'narbonne','Vienna':'vienne','Arelate':'arles','Aquae Sextiae':'aix|aix en provence','Caesaraugusta':'zaragoza|saraqusta',
'Tarraco':'tarragona','Toletum':'toledo|tulaytula','Valentia':'valencia|balansiya','Carthago Nova':'cartagena|qartajanna','Corduba':'cordoba|qurtuba','Hispalis':'sevilla|seville|ishbiliya',
'Malaca':'malaga|malaqa','Emerita Augusta':'merida|marida','Olisipo':'lisboa|lisbon|al ushbuna','Pax Iulia':'beja|baja','Asturica Augusta':'astorga','Bracara Augusta':'braga',
'Palma':'palma|mayurqa|mallorca','Iol Caesarea':'cherchell|shirshal','Tingis':'tangier|tanja','Hippo Regius':'annaba|bona|buna','Cirta':'constantine|qusantina','Carthago':'tunis|carthage',
'Hadrumetum':'sousse|susa','Leptis Magna':'leptis|labda|khoms','Aquileia':'aquileia','Patavium':'padova|padua','Verona':'verona','Segusio':'susa|segusio','Ticinum':'pavia',
'Mediolanum':'milano|milan','Castra Regina':'regensburg','Augusta Vindelicum':'augsburg','Ravenna':'ravenna','Ancona':'ancona','Pisae':'pisa','Arretium':'arezzo',
'Ostia':'ostia','Neapolis':'napoli|naples','Roma':'roma|rome','Brundisium':'brindisi','Rhegium':'reggio','Panormus':'palermo|balarm','Syracusae':'siracusa|syracuse',
'Caralis':'cagliari|karalis','Aleria':'aleria','Lauriacum':'enns|lorch|lauriacum','Vindobona':'wien|vienna|vindobona','Aquincum':'obuda|buda','Sirmium':'sirmium|srem|mitrovica',
'Salona':'salona|split|spalato','Ratiaria':'archar|ratiaria|vidin','Serdica':'sredets|sofia|serdica','Naissus':'nis|nish|naissus','Viminacium':'kostolac|viminacium|branicevo',
'Dioclea':'doclea|duklja|dioclea','Durostorum':'dorostolon|silistra|drastar','Marcianopolis':'markianoupolis|devnya','Dyrrachium':'dyrrachion|durres|durazzo',
'Nicopolis':'nikopolis|preveza','Stobi':'stobi','Thessalonica':'thessalonike|thessaloniki','Larissa':'larissa','Athenae':'athens|athenai|athina','Patrae':'patras|patrai',
'Corinthus':'corinth|korinthos','Philippopolis':'philippopolis|plovdiv','Hadrianopolis':'adrianople|adrianoupolis|edirne','Nova Roma':'constantinople','Cannstatt':'cannstatt|stuttgart'}
CITIES=[(nm,r,la,lo) for r,R_ in enumerate(REGALL) for (nm,la,lo) in R_[3]]
cityb={}; report=[]
inwin=set(np.unique(pid).tolist())
FIX={'Tingis':4683,'Sirmium':3739,'Hadrianopolis':494,'Durostorum':508,'Dioclea':469,'Segusio':2042,'Stobi':3651,'Aleria':2647}
for nm,r,la,lo in CITIES:
    if nm in FIX:
        pick=FIX[nm]; cityb[nm]=pick; report.append((nm,'вручную',bar[pick]['b'],bar[pick]['c'])); creg[bar[pick]['c']]=r; continue
    q=fwd([la],[lo])[0]; qx,qy=q[0]-X0,q[1]-Y0
    cand=[]
    for a in ALIAS[nm].split('|'):
        for p in bkey.get(norm(a),[]):
            if p in inwin: cand.append(p)
    pick=None
    if cand:
        best=None
        for p in set(cand):
            yy,xx=np.nonzero(pid==p); d=np.hypot(xx.mean()-qx,yy.mean()-qy)
            if best is None or d<best[0]: best=(d,p)
        if best[0]<60: pick=best[1]; how='имя'
    if pick is None:
        i,j=int(round(qy)),int(round(qx)); pick=int(pid[i,j]); how='координаты'
        if pick not in bar:
            m=np.argwhere(isbar[pid[max(0,i-30):i+31,max(0,j-30):j+31]]); k=((m[:,0]-30)**2+(m[:,1]-30)**2).argmin(); pick=int(pid[max(0,i-30)+m[k,0],max(0,j-30)+m[k,1]])
    cityb[nm]=pick; report.append((nm,how,bar[pick]['b'],bar[pick]['c']))
    creg[bar[pick]['c']]=r
for x in report: print(*x)
json.dump({'creg':creg,'cityb':cityb,'crop':[X0,X1,Y0,Y1]},open('assign.json','w'))
print('counties assigned',sum(1 for v in creg.values() if v>=0),'of',len(creg),file=sys.stderr)
