import { test, expect } from "@playwright/test";

const DRAFT_SLUGS = ["errores-que-puede-cometer-un-scrum-master", "echometer", "timbo-aplicacion-retrospectivas-agiles"];

test.describe("sitio público", () => {
  for (const path of ["/blog", "/blog/rss.xml", "/inicio", "/contacto", "/sobre-mi", "/admin/login"]) {
    test(`${path} responde 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
    });
  }

  test("una ruta inexistente da 404", async ({ request }) => {
    expect((await request.get("/esta-pagina-no-existe")).status()).toBe(404);
  });

  test("el backoffice exige sesión: /admin lleva al login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe("contenido migrado de Wix", () => {
  test("el RSS tiene 17 entradas, de la más nueva a la más antigua, sin borradores", async ({ request }) => {
    const xml = await (await request.get("/blog/rss.xml")).text();
    const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => new Date(m[1]).getTime());
    expect(dates).toHaveLength(17);
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(new Date(dates[dates.length - 1]).getUTCFullYear()).toBe(2020); // la más antigua
    for (const slug of DRAFT_SLUGS) expect(xml).not.toContain(slug);
  });

  test("un post antiguo conserva su fecha original (Kanban: 2 nov 2020)", async ({ page }) => {
    await page.goto("/blog/kanban");
    await expect(page.getByRole("heading", { level: 1, name: "Kanban" })).toBeVisible();
    await expect(page.getByText("2 nov 2020")).toBeVisible();
  });

  test("/blog lista los posts en su posición cronológica", async ({ page }) => {
    await page.goto("/blog");
    const hrefs = await page.locator('a[href^="/blog/"]').evaluateAll((as) =>
      [...new Set(as.map((a) => a.getAttribute("href")!))].filter((h) => !h.endsWith("rss.xml")),
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(17);
    expect(hrefs.indexOf("/blog/kanban")).toBeGreaterThan(hrefs.indexOf("/blog/scrum-historia"));
    expect(hrefs.indexOf("/blog/metodologias-agiles-marcos-agiles")).toBe(hrefs.length - 1);
  });

  for (const slug of DRAFT_SLUGS) {
    test(`el borrador ${slug} no es público`, async ({ request }) => {
      expect((await request.get(`/blog/${slug}`)).status()).toBe(404);
      expect(await (await request.get("/blog")).text()).not.toContain(slug);
    });
  }

  test("las páginas nuevas siguen en borrador (404 en público)", async ({ request }) => {
    for (const slug of ["servicios", "experiencias-y-anecdotas", "podcast", "interesante", "linkedin-feed"]) {
      expect((await request.get(`/${slug}`)).status(), slug).toBe(404);
    }
  });
});

test.describe("redirecciones 301 desde Wix", () => {
  const cases: Array<[string, string]> = [
    ["/post/kanban", "/blog/kanban"],
    ["/post/metodolog%C3%ADas-%C3%A1giles", "/blog/metodologias-agiles-marcos-agiles"],
    ["/post/loa-12-principios-del-manifiesto-%C3%A1gil", "/blog/los-12-principios-del-manifiesto-agil-parte-1"],
    ["/sobre-m%C3%AD", "/sobre-mi"],
    ["/contact-4", "/contacto"],
    ["/aboutme", "/sobre-mi"],
  ];
  for (const [from, to] of cases) {
    test(`${decodeURIComponent(from)} → ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(new URL(res.headers()["location"], "http://x").pathname).toBe(to);
    });
  }

  test("conserva los parámetros de la URL", async ({ request }) => {
    const res = await request.get("/post/kanban?utm_source=x", { maxRedirects: 0 });
    expect(res.headers()["location"]).toContain("utm_source=x");
  });

  test("una URL ya nueva no se redirige", async ({ request }) => {
    expect((await request.get("/sobre-mi", { maxRedirects: 0 })).status()).toBe(200);
  });

  test("el destino final del redirect carga", async ({ page }) => {
    await page.goto("/post/kanban");
    await expect(page).toHaveURL(/\/blog\/kanban$/);
  });
});

test.describe("diseño (igual al de Wix)", () => {
  test("encabezado y pie en azul marino #1F2A44", async ({ page }) => {
    await page.goto("/inicio");
    const navy = "rgb(31, 42, 68)";
    await expect(page.locator("header").first()).toHaveCSS("background-color", navy);
    await expect(page.locator("footer").first()).toHaveCSS("background-color", navy);
  });

  test("la portada tiene sus secciones y los títulos en índigo #3A3F7A", async ({ page }) => {
    await page.goto("/inicio");
    for (const name of ["¿Quién está detrás de", "Servicios", "Entradas destacadas"]) {
      await expect(page.getByRole("heading", { name })).toHaveCSS("color", "rgb(58, 63, 122)");
    }
    await expect(page.getByRole("link", { name: "Acerca de mí" })).toHaveAttribute("href", "/sobre-mi");
  });

  test("tipografía Alegreya en el sitio público", async ({ page }) => {
    await page.goto("/inicio");
    await expect(page.locator(".site-public").first()).toHaveCSS("font-family", /Alegreya/);
  });

  test("las imágenes de la portada cargan (ninguna rota)", async ({ page, request }) => {
    await page.goto("/inicio");
    await page.waitForLoadState("networkidle");
    const srcs = await page.locator("main img, article img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src));
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) expect((await request.get(src)).status(), src).toBe(200);
  });

  test("el contacto muestra dirección, teléfono, correo y formulario", async ({ page }) => {
    await page.goto("/contacto");
    await expect(page.getByText("C/ Antonio Maceo")).toBeVisible();
    await expect(page.getByText("829-214-2496")).toBeVisible();
    await expect(page.getByRole("link", { name: "scrummetme@gmail.com" })).toBeVisible();
    await expect(page.locator("form").first()).toBeVisible();
  });
});
