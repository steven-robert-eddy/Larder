import { requireUser } from "@/lib/session";
import { env } from "@/lib/env";
import { SelectableTextarea } from "./selectable-textarea";
import { BookmarkletLink } from "./bookmarklet-link";

function buildBookmarklet(baseUrl: string, token: string): string {
  const js = `(function(){
    var b=${JSON.stringify(baseUrl)};
    var t=${JSON.stringify(token)};
    var w=window.open('','_blank');
    if(w){w.document.write('Clipping to Larder...');}
    fetch(b+'/api/import/clip',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
      body:JSON.stringify({url:location.href,html:document.documentElement.outerHTML})
    }).then(function(r){return r.json();}).then(function(d){
      if(d.reviewUrl&&w){w.location=b+d.reviewUrl;}
      else{if(w)w.close();alert('Larder: '+(d.error||'import failed'));}
    }).catch(function(e){if(w)w.close();alert('Larder: '+e.message);});
  })();`;
  return `javascript:${encodeURIComponent(js.replace(/\s+/g, " "))}`;
}

export default async function BookmarkletPage() {
  await requireUser();
  const configured = Boolean(env.clipToken);
  const bookmarklet = configured ? buildBookmarklet(env.baseUrl, env.clipToken) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Clip from any page</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Some sites (Allrecipes and other big commercial ones especially) block the
          paste-a-URL import — their server sees a request that doesn&apos;t look like a
          real browser and refuses it. This works around that: it reads the page from
          inside your own browser, while you&apos;re already looking at it, so nothing
          about the request looks automated.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Not set up yet — add <code>CLIP_TOKEN</code> to your <code>.env</code> (any
          random string, e.g. <code>openssl rand -hex 24</code>) and redeploy to enable
          this.
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Desktop
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Drag this to your bookmarks bar:
            </p>
            <BookmarkletLink
              href={bookmarklet ?? "#"}
              className="self-start rounded-lg border-2 border-dashed border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
            >
              🔖 Clip to Larder
            </BookmarkletLink>
            <p className="text-xs text-neutral-400">
              (It&apos;s a link, not a button — drag it up to the bookmarks bar rather
              than clicking it here. It&apos;s meant to run on a recipe page, not this one.)
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              iPhone / iPad (Safari)
            </h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
              <li>Bookmark any page (share icon → Add Bookmark).</li>
              <li>Open Bookmarks, swipe the new one left, tap Edit.</li>
              <li>
                Rename it <span className="font-medium">Clip to Larder</span>, then
                replace the URL field with the code below.
              </li>
              <li>Save. From then on, open it from Bookmarks while viewing any recipe page.</li>
            </ol>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Android (Chrome)
            </h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
              <li>Bookmark any page (⋮ menu → Add to bookmarks).</li>
              <li>Chrome menu → Bookmarks, tap ⋮ next to the new one → Edit.</li>
              <li>
                Rename it <span className="font-medium">Clip to Larder</span>, replace
                the URL with the code below, save.
              </li>
              <li>
                Open it from the address bar by typing part of the bookmark name and
                selecting it while on a recipe page.
              </li>
            </ol>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              The code (for the mobile steps above)
            </h2>
            <SelectableTextarea value={bookmarklet ?? ""} />
            <p className="text-xs text-neutral-400">
              Tap the box to select it all, then copy. This link contains a secret
              token — don&apos;t share it or post it anywhere public.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
