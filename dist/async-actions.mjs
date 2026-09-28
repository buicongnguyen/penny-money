// One personal-data mutation at a time, including while a Web Lock is pending.
// Ignoring repeated submissions is deliberate; queuing them would create duplicates.
export function createMutationGuard(onBusy=()=>{},onError=null) {
  let pending=false;
  return action=>async(...args)=>{
    args[0]?.preventDefault?.();
    if(pending){onBusy();return false;}
    pending=true;
    try{return await action(...args);}catch(error){if(!onError)throw error;onError(error);return false;}finally{pending=false;}
  };
}

// A file read that finishes late must not replace a newer selection or pasted text.
export function createLatestRequest(){
  let generation=0;
  return {begin:()=>++generation,current:token=>token===generation,invalidate:()=>++generation};
}

export async function recognizeReceipt({createWorker,image,language,signal,onProgress=()=>{},timeoutMs=120000}) {
  let active=true,worker,timer;
  const cancelled=()=>Object.assign(new Error('Receipt scan cancelled.'),{name:'AbortError'});
  const dispose=async value=>{try{await value?.terminate();}catch{/* Worker may already be stopped. */}};
  let abort;
  const interrupted=new Promise((_,reject)=>{
    abort=()=>reject(cancelled());
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>reject(new Error('OCR took too long. Try a smaller, clearer photo, or enter the details manually.')),timeoutMs);
  });
  const recognition=(async()=>{
    if(signal?.aborted)throw cancelled();
    const created=await createWorker(language,event=>{if(active&&!signal?.aborted)onProgress(event);});
    if(!active||signal?.aborted){await dispose(created);throw cancelled();}
    worker=created;
    return (await worker.recognize(image)).data.text;
  })();
  try{return await Promise.race([recognition,interrupted]);}
  finally{active=false;clearTimeout(timer);signal?.removeEventListener('abort',abort);await dispose(worker);}
}
