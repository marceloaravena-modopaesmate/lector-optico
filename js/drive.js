// Subir fotos de hojas desde Google Drive (Google Picker).
// Para que funcione hay que crear, una sola vez, credenciales en Google Cloud y copiarlas aquí abajo.
// No son secretas: la clave de API queda limitada al sitio de la app desde Google Cloud.
const GOOGLE_DRIVE = {
  clientId: '',   // "ID de cliente" de OAuth (termina en .apps.googleusercontent.com)
  apiKey: '',     // "Clave de API"
  appId: '',      // "Número del proyecto" (solo números)
};

const Drive = (() => {
  const CFG = GOOGLE_DRIVE;
  const ALCANCE = 'https://www.googleapis.com/auth/drive.file';
  let carga = null, token = null, vence = 0;

  const configurado = () => !!(CFG.clientId && CFG.apiKey && CFG.appId);
  const cargado = () => !!(window.google && google.accounts && google.accounts.oauth2 && google.picker);

  const script = (url) => new Promise((ok, mal) => {
    const sc = document.createElement('script'); sc.src = url; sc.async = true;
    sc.onload = ok; sc.onerror = () => { sc.remove(); mal(new Error('no cargó ' + url)); };
    document.head.appendChild(sc);
  });

  // Carga las librerías de Google con anticipación: el inicio de sesión debe abrirse justo al tocar el botón.
  function precargar() {
    if (!configurado() || !navigator.onLine) return Promise.reject(new Error('sin conexión'));
    if (!carga) {
      carga = Promise.all([script('https://accounts.google.com/gsi/client'), script('https://apis.google.com/js/api.js')])
        .then(() => new Promise((ok, mal) => gapi.load('picker', { callback: ok, onerror: mal })))
        .catch((e) => { carga = null; throw e; });
    }
    return carga;
  }

  function pedirPermiso() {
    if (token && Date.now() < vence) return Promise.resolve(token);
    return new Promise((ok, mal) => {
      const cliente = google.accounts.oauth2.initTokenClient({
        client_id: CFG.clientId, scope: ALCANCE,
        callback: (r) => {
          if (r.error) return mal(new Error(r.error));
          token = r.access_token; vence = Date.now() + (Number(r.expires_in || 3600) - 120) * 1000;
          ok(token);
        },
        error_callback: (e) => mal(new Error((e && e.type) || 'cancelado')),
      });
      cliente.requestAccessToken({ prompt: token ? '' : 'select_account' });
    });
  }

  function abrirSelector(tk) {
    return new Promise((ok) => {
      const P = google.picker;
      const vista = new P.DocsView(P.ViewId.DOCS_IMAGES).setIncludeFolders(true).setMode(P.DocsViewMode.GRID);
      const picker = new P.PickerBuilder()
        .addView(vista)
        .enableFeature(P.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(tk).setDeveloperKey(CFG.apiKey).setAppId(CFG.appId)
        .setLocale('es').setTitle('Elige las fotos de las hojas')
        .setCallback((d) => {
          if (d[P.Response.ACTION] === P.Action.PICKED) ok(d[P.Response.DOCUMENTS] || []);
          else if (d[P.Response.ACTION] === P.Action.CANCEL) ok([]);
        })
        .build();
      picker.setVisible(true);
    });
  }

  async function bajar(doc, tk) {
    const id = doc[google.picker.Document.ID];
    const nombre = doc[google.picker.Document.NAME] || 'foto';
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, { headers: { Authorization: 'Bearer ' + tk } });
    if (!r.ok) throw new Error('No pude bajar ' + nombre);
    const blob = await r.blob();
    return new File([blob], nombre, { type: doc[google.picker.Document.MIME_TYPE] || blob.type });
  }

  // Devuelve las fotos elegidas como archivos, igual que "Subir fotos".
  async function elegirFotos(alBajar) {
    const tk = await pedirPermiso();
    const docs = await abrirSelector(tk);
    if (!docs.length) return [];
    if (alBajar) alBajar(docs.length);
    const archivos = [];
    for (const d of docs) archivos.push(await bajar(d, tk));
    return archivos;
  }

  return { configurado, cargado, precargar, elegirFotos };
})();
