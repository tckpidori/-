import numpy as np, json, sys, math
lab=np.load('lab.npy'); R=json.load(open('regions_used.json'))
H,W=lab.shape; S=0.02; L0,B1=-16.0,62.0
P=np.full((H+2,W+2),-2,dtype=np.int32); P[1:-1,1:-1]=lab
CW=W+3  # corner grid width
def node(i,j): return i*CW+j
edges=[]  # (n1,n2,left,right)
# vertical edges between cells (i,j-1) and (i,j), j=1..W+1, i=0..H+1
diff=P[:,1:]!=P[:,:-1]
ii,jj=np.nonzero(diff); jj=jj+1
for i,j in zip(ii.tolist(),jj.tolist()): edges.append((node(i,j),node(i+1,j),int(P[i,j]),int(P[i,j-1])))
diff=P[1:,:]!=P[:-1,:]
ii,jj=np.nonzero(diff); ii=ii+1
for i,j in zip(ii.tolist(),jj.tolist()): edges.append((node(i,j),node(i,j+1),int(P[i-1,j]),int(P[i,j])))
print('boundary edges',len(edges),file=sys.stderr)
adj={}
for e,(a,b,l,r) in enumerate(edges):
    adj.setdefault(a,[]).append(e); adj.setdefault(b,[]).append(e)
visited=bytearray(len(edges))
arcs=[]  # (points[node ids], left, right)
def walk(start_node,e):
    pts=[start_node]; cur=start_node
    a,b,l,r=edges[e]
    if a==cur: nxt,L,Rr=b,l,r
    else: nxt,L,Rr=a,r,l
    visited[e]=1; pts.append(nxt); cur=nxt
    while len(adj[cur])==2 and cur!=start_node:
        e2=[x for x in adj[cur] if not visited[x]]
        if not e2: break
        e2=e2[0]; a,b,l,r=edges[e2]
        if a==cur: nxt,L2,R2=b,l,r
        else: nxt,L2,R2=a,r,l
        assert (L2,R2)==(L,Rr)
        visited[e2]=1; pts.append(nxt); cur=nxt
    return pts,L,Rr
for n,es in adj.items():
    if len(es)==2: continue
    for e in es:
        if not visited[e]: arcs.append(walk(n,e))
for e in range(len(edges)):
    if not visited[e]: arcs.append(walk(edges[e][0],e))
print('arcs',len(arcs),file=sys.stderr)
# simplify (DP) in corner-grid units, endpoints fixed
def dp(pts,tol):
    if len(pts)<3: return pts
    keep=[False]*len(pts); keep[0]=keep[-1]=True; st=[(0,len(pts)-1)]
    while st:
        a,b=st.pop()
        if b<=a+1: continue
        ax,ay=pts[a]; bx,by=pts[b]; dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy; md,mi=-1,-1
        for i in range(a+1,b):
            px,py=pts[i]
            if L==0: d=math.hypot(px-ax,py-ay)
            else:
                t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L)); d=math.hypot(px-(ax+t*dx),py-(ay+t*dy))
            if d>md: md,mi=d,i
        if md>tol: keep[mi]=True; st.append((a,mi)); st.append((mi,b))
    return [p for p,k in zip(pts,keep) if k]
TOL=1.1
out_arcs=[]; meta=[]
for pts,l,r in arcs:
    xy=[(n%CW, n//CW) for n in pts]   # (j,i) corner coords
    closed = pts[0]==pts[-1]
    if closed and len(xy)>3:
        # keep a mid point so a loop does not collapse
        m=len(xy)//2; s1=dp(xy[:m+1],TOL); s2=dp(xy[m:],TOL); xy=s1+s2[1:]
    else: xy=dp(xy,TOL)
    out_arcs.append(xy); meta.append((l,r,pts[0],pts[-1]))
npts=sum(len(a) for a in out_arcs); print('points after simplify',npts,file=sys.stderr)
# rings per region
from collections import defaultdict
starts=defaultdict(list)
for k,(l,r,a,b) in enumerate(meta):
    if l>=0: starts[(l,a)].append((k,1,b))
    if r>=0: starts[(r,b)].append((k,-1,a))
regions={}
used=set()
for k,(l,r,a,b) in enumerate(meta):
    for reg,dirn in ((l,1),(r,-1)):
        if reg<0 or (k,dirn) in used: continue
        ring=[]; cur=(k,dirn)
        startnode=a if dirn==1 else b
        while True:
            used.add(cur); ring.append(cur[0] if cur[1]==1 else ~cur[0])
            endnode=meta[cur[0]][3] if cur[1]==1 else meta[cur[0]][2]
            if endnode==startnode: break
            cands=[c for c in starts[(reg,endnode)] if (c[0],c[1]) not in used]
            if not cands: print('open ring in region',reg,file=sys.stderr); break
            cur=(cands[0][0],cands[0][1])
        regions.setdefault(reg,[]).append(ring)
# anchors: erosion-based interior point per region
anchors={}
for k in range(len(R)):
    m=(lab==k)
    if not m.any(): continue
    ys,xs=np.nonzero(m); i0,i1,j0,j1=ys.min(),ys.max(),xs.min(),xs.max()
    sub=m[i0:i1+1,j0:j1+1].copy(); last=sub
    for it in range(60):
        er=sub.copy(); er[1:,:]&=sub[:-1,:]; er[:-1,:]&=sub[1:,:]; er[:,1:]&=sub[:,:-1]; er[:,:-1]&=sub[:,1:]
        er[0,:]=False; er[-1,:]=False; er[:,0]=False; er[:,-1]=False
        if not er.any(): break
        last=er; sub=er
    ys,xs=np.nonzero(last); ci,cj=ys.mean()+i0,xs.mean()+j0
    anchors[k]=[round(L0+(cj+.5)*S,3), round(B1-(ci+.5)*S,3), int(m.sum())]
# delta-encode arcs (corner coords -> lon/lat via page): lon=L0+(j-1)*S, lat=B1-(i-1)*S
enc=[]
for xy in out_arcs:
    px,py=xy[0]; row=[[px,py]]
    for x,y in xy[1:]: row.append([x-px,y-py]); px,py=x,y
    enc.append(row)
topo={"S":S,"L0":L0,"B1":B1,"arcs":enc,"meta":[[l,r] for l,r,a,b in meta],"regions":{str(k):v for k,v in regions.items()},"anchors":anchors}
js="window.TOPO="+json.dumps(topo,separators=(',',':'))+";"
open('topo.js','w').write(js); print('topo.js',len(js)//1024,'KB',file=sys.stderr)
