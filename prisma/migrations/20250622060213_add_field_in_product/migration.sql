/*
  Warnings:

  - Added the required column `games_name` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "games_name" TEXT NOT NULL;
