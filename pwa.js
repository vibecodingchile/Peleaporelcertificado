// PWA helpers: registra Service Worker y habilita instalación (si el navegador lo soporta).

export function initPWA(){
  const btnInstall = document.getElementById("btnInstall");
  const btnReload = document.getElementById("btnReload");

  let deferredPrompt = null;

  function show(el){ el?.classList.remove("hidden"); }
  function hide(el){ el?.classList.add("hidden"); }

  // --- Instalación ---
  window.addEventListener("beforeinstallprompt", (e)=>{
    // Chrome/Edge/Android: permite mostrar botón propio
    e.preventDefault();
    deferredPrompt = e;
    if(btnInstall) show(btnInstall);
  });

  btnInstall?.addEventListener("click", async ()=>{
    if(!deferredPrompt) return;
    btnInstall.disabled = true;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(()=> null);
    deferredPrompt = null;
    hide(btnInstall);
    btnInstall.disabled = false;

    // si canceló, igual ocultamos para evitar spam; el navegador lo volverá a permitir más adelante
    console.log("PWA install choice:", choice);
  });

  // iOS Safari no dispara beforeinstallprompt. Mostramos un texto en menú (solo informativo).
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches || (navigator.standalone === true);
  const iosHint = document.getElementById("iosInstallHint");
  if(isIOS && !isStandalone && iosHint){
    iosHint.classList.remove("hidden");
  }

  // --- Service Worker ---
  if("serviceWorker" in navigator){
    window.addEventListener("load", async ()=>{
      try{
        const reg = await navigator.serviceWorker.register("./sw.js");
        // Si hay una actualización esperando, ofrece recargar
        reg.addEventListener("updatefound", ()=>{
          const nw = reg.installing;
          if(!nw) return;
          nw.addEventListener("statechange", ()=>{
            if(nw.state === "installed" && navigator.serviceWorker.controller){
              // nueva versión lista
              if(btnReload) show(btnReload);
            }
          });
        });

        btnReload?.addEventListener("click", ()=>{
          // fuerza a tomar la nueva versión
          window.location.reload();
        });
      }catch(err){
        console.warn("SW register failed:", err);
      }
    });
  }
}
