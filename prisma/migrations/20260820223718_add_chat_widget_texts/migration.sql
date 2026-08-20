-- AlterTable
ALTER TABLE "CommunicationSettings" ADD COLUMN     "chatWidgetButtonLabel" TEXT NOT NULL DEFAULT '💬 ¡Vamos a chatear!',
ADD COLUMN     "chatWidgetPlaceholder" TEXT NOT NULL DEFAULT 'Escribe tu mensaje...',
ADD COLUMN     "chatWidgetSuccessMessage" TEXT NOT NULL DEFAULT 'Gracias, te responderemos pronto.',
ADD COLUMN     "chatWidgetTitle" TEXT NOT NULL DEFAULT 'Un buen negocio';
