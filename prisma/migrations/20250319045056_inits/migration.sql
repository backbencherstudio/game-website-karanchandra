/*
  Warnings:

  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customer_id` to the `payment_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "customer_id" TEXT NOT NULL,
ADD COLUMN     "invoice_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
