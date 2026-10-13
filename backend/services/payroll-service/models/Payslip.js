import mongoose from "mongoose";

const payslipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    basicSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PAID", "PENDING"],
      default: "PAID",
    },
  },
  { timestamps: true }
);

payslipSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const Payslip = mongoose.model("Payslip", payslipSchema);
export default Payslip;
