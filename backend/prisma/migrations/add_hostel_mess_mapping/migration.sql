-- CreateTable
CREATE TABLE "hostel_mess_mappings" (
    "id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "mess_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hostel_mess_mappings_pkey" PRIMARY KEY ("id")
);

-- AddUniqueConstraint
ALTER TABLE "hostel_mess_mappings" ADD CONSTRAINT "hostel_mess_mappings_hostel_id_key" UNIQUE("hostel_id");

-- CreateIndex
CREATE INDEX "hostel_mess_mappings_hostel_id_idx" ON "hostel_mess_mappings"("hostel_id");

-- CreateIndex
CREATE INDEX "hostel_mess_mappings_mess_id_is_active_idx" ON "hostel_mess_mappings"("mess_id", "is_active");

-- AddForeignKey
ALTER TABLE "hostel_mess_mappings" ADD CONSTRAINT "hostel_mess_mappings_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_mess_mappings" ADD CONSTRAINT "hostel_mess_mappings_mess_id_fkey" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddColumn to mess_assignments
ALTER TABLE "mess_assignments" ADD COLUMN "auto_assigned" BOOLEAN NOT NULL DEFAULT false;
