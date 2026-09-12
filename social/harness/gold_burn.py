import importlib.util, pathlib, os, sys, shutil
from PIL import ImageDraw
wf=pathlib.Path(os.environ["HF_WORKFLOWS"])/"subtitles"/"scripts"
spec=importlib.util.spec_from_file_location("burn",wf/"subtitle_paper_burn.py")
burn=importlib.util.module_from_spec(spec);spec.loader.exec_module(burn)
original_text=ImageDraw.ImageDraw.text
def gold_text(self,xy,text,*args,**kwargs):
 if kwargs.get("fill")== (255,255,255,255):kwargs["fill"]=(255,211,61,255)
 return original_text(self,xy,text,*args,**kwargs)
ImageDraw.ImageDraw.text=gold_text
original_label=burn.bold_label
def checked_label(text,font,W,H,*args,**kwargs):
 im=original_label(text,font,W,H,*args,**kwargs)
 box=im.getbbox()
 assert box and box[0]>=W*.10 and box[2]<=W*.90 and box[3]<H*.81,(text,box)
 print("CAPTION_LAYOUT",font.size,box,text,flush=True)
 return im
burn.bold_label=checked_label
temporary=[]
original_mkdtemp=burn.tempfile.mkdtemp
def task_temp(*a,**kw):
 p=original_mkdtemp(*a,**kw);temporary.append(p);return p
burn.tempfile.mkdtemp=task_temp
try:burn.main()
finally:
 for p in temporary:shutil.rmtree(p)
