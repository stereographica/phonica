-- Add unique constraint to Material.title
ALTER TABLE "Material" ADD CONSTRAINT "Material_title_key" UNIQUE ("title");

-- Add unique constraint to Equipment.name
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_name_key" UNIQUE ("name");