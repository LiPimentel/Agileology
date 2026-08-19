import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const name = process.env.ADMIN_SEED_NAME ?? "Admin";
  const email = (process.env.ADMIN_SEED_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe123!";
  const chatEmail = process.env.CHAT_DESTINATION_EMAIL_DEFAULT ?? email;
  const contactEmail = process.env.CONTACT_DESTINATION_EMAIL_DEFAULT ?? email;

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash },
  });
  console.log(`Admin ready: ${admin.email}`);

  await prisma.communicationSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", chatDestinationEmail: chatEmail, contactFormDestinationEmail: contactEmail },
  });

  await prisma.blogSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", layoutType: "grid" },
  });

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      siteTitle: "Agileology Wave",
      tagline: "¿Quieres seguir creciendo en la gestión?",
      defaultMetaDescription: "Agileology Wave — coaching y gestión ágil.",
      footerText: `© ${new Date().getFullYear()} Agileology Wave. Todos los derechos reservados.`,
    },
  });

  const home = await prisma.page.upsert({
    where: { slug: "home" },
    update: {},
    create: {
      title: "Inicio",
      slug: "home",
      status: "published",
      menuOrder: 0,
      isSystem: true,
      seoTitle: "Agileology Wave",
      seoDescription: "Coaching y gestión ágil con Agileology Wave.",
      publishedAt: new Date(),
      blocks: {
        create: [
          {
            type: "text",
            position: 0,
            content: {
              html: "<h1>¿Quieres seguir creciendo en la gestión?</h1><p>Bienvenido a Agileology Wave.</p>",
            },
          },
        ],
      },
    },
  });
  await prisma.background.upsert({
    where: { pageId: home.id },
    update: {},
    create: { pageId: home.id, overlayColor: "#3B0764", overlayOpacity: 0.55 },
  });

  const contact = await prisma.page.upsert({
    where: { slug: "contact" },
    update: {},
    create: {
      title: "Contacto",
      slug: "contact",
      status: "published",
      menuOrder: 10,
      isSystem: true,
      seoTitle: "Contacto — Agileology Wave",
      publishedAt: new Date(),
    },
  });
  await prisma.mapComponent.upsert({
    where: { pageId: contact.id },
    update: {},
    create: { pageId: contact.id, address: "Zapopan, Jalisco, México" },
  });
  await prisma.contactFormComponent.upsert({
    where: { pageId: contact.id },
    update: {},
    create: { pageId: contact.id, enabledFields: ["name", "email", "message"] },
  });

  const privacy = await prisma.page.upsert({
    where: { slug: "privacy-policy" },
    update: {},
    create: {
      title: "Política de privacidad",
      slug: "privacy-policy",
      status: "published",
      showInMenu: false,
      menuVisible: false,
      isSystem: true,
      publishedAt: new Date(),
      blocks: {
        create: [
          {
            type: "text",
            position: 0,
            content: {
              html: "<h1>Política de privacidad</h1><p>Esta página describe cómo se recopilan y usan los datos de contacto y chat de este sitio.</p>",
            },
          },
        ],
      },
    },
  });

  console.log(`Seeded pages: ${home.slug}, ${contact.slug}, ${privacy.slug}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
