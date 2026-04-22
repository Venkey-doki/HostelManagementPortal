-- CreateTable
CREATE TABLE "mess_monthly_rates" (
    "id" UUID NOT NULL,
    "mess_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "per_day_charge" DECIMAL(10,2) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mess_monthly_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mess_monthly_rates_mess_id_month_key" ON "mess_monthly_rates"("mess_id", "month");

-- CreateIndex
CREATE INDEX "mess_monthly_rates_month_idx" ON "mess_monthly_rates"("month");

-- AddForeignKey
ALTER TABLE "mess_monthly_rates" ADD CONSTRAINT "mess_monthly_rates_mess_id_fkey" FOREIGN KEY ("mess_id") REFERENCES "messes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_monthly_rates" ADD CONSTRAINT "mess_monthly_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
