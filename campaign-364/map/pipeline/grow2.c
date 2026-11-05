/* Multi-source Dijkstra on an equirectangular raster.
   usage: grow W H B1 S classmask.u8 cost.f32 sources.bin owner.i32 dist.f32
   sources.bin: int32 n, then n x {int32 cell, int32 classbits, float32 reach}
   A source may enter a cell only if (classmask[cell] & classbits). Steps are 8-neighbour,
   horizontal length = cos(lat), vertical = 1, no corner cutting past blocked cells. */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
typedef struct { float d; int c; } HE;
static HE *hp; static long hn=0, hcap;
static void push(float d,int c){ if(hn>=hcap){hcap*=2;hp=realloc(hp,hcap*sizeof(HE));} long i=hn++; while(i>0){long p=(i-1)/2; if(hp[p].d<=d)break; hp[i]=hp[p]; i=p;} hp[i].d=d; hp[i].c=c; }
static HE pop(void){ HE top=hp[0]; HE last=hp[--hn]; long i=0; for(;;){ long l=2*i+1,r=l+1,m=i; float md=last.d; if(l<hn&&hp[l].d<md){m=l;md=hp[l].d;} if(r<hn&&hp[r].d<md){m=r;} if(m==i)break; hp[i]=hp[m]; i=m;} if(hn>0) hp[i]=last; return top; }
int main(int argc,char**argv){
  int W=atoi(argv[1]),H=atoi(argv[2]); double B1=atof(argv[3]),S=atof(argv[4]); long N=(long)W*H;
  int*cm=malloc(N*4); float*cost=malloc(N*4);
  FILE*f=fopen(argv[5],"rb"); if(fread(cm,4,N,f)!=(size_t)N) return 1; fclose(f);
  f=fopen(argv[6],"rb"); if(fread(cost,4,N,f)!=(size_t)N) return 1; fclose(f);
  f=fopen(argv[7],"rb"); int ns; if(fread(&ns,4,1,f)!=1) return 1;
  int*sc=malloc(ns*4),*sb=malloc(ns*4); float*sr=malloc(ns*4);
  for(int k=0;k<ns;k++){ if(fread(&sc[k],4,1,f)!=1||fread(&sb[k],4,1,f)!=1||fread(&sr[k],4,1,f)!=1) return 1; } fclose(f);
  int*own=malloc(N*4); float*dist=malloc(N*4); for(long i=0;i<N;i++){own[i]=-1;dist[i]=1e30f;}
  double*cl=malloc(H*sizeof(double)); for(int i=0;i<H;i++) cl[i]=cos((B1-(i+0.5)*S)*M_PI/180.0);
  hcap=1<<20; hp=malloc(hcap*sizeof(HE));
  for(int k=0;k<ns;k++){ int c=sc[k]; if(c<0||c>=N) continue; if(cm[c]<0) continue; sb[k]=cm[c]; if(dist[c]>0){dist[c]=0;own[c]=k;push(0,c);} }
  int di[8]={-1,1,0,0,-1,-1,1,1}, dj[8]={0,0,-1,1,-1,1,-1,1};
  while(hn>0){ HE e=pop(); int c=e.c; if(e.d>dist[c]) continue; int k=own[c]; int i=c/W,j=c%W;
    for(int t=0;t<8;t++){ int ni=i+di[t],nj=j+dj[t]; if(ni<0||ni>=H||nj<0||nj>=W) continue; int n=ni*W+nj;
      if(cm[n]!=sb[k]) continue;
      if(t>=4){ int a=i*W+nj, b=ni*W+j; if(cm[a]!=sb[k]||cm[b]!=sb[k]) continue; }
      double cy=(cl[i]+cl[ni])*0.5; double len = t<2?1.0 : t<4? cy : sqrt(1.0+cy*cy);
      float nd=e.d+(float)(len*0.5*(cost[c]+cost[n]));
      if(nd>sr[k]) continue;
      if(nd<dist[n]){ dist[n]=nd; own[n]=k; push(nd,n);} } }
  f=fopen(argv[8],"wb"); fwrite(own,4,N,f); fclose(f);
  f=fopen(argv[9],"wb"); fwrite(dist,4,N,f); fclose(f); return 0; }
