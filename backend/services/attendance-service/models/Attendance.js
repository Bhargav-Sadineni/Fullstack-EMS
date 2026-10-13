import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: { type: Date, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    workingHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "LATE", "HALF_DAY"],
      default: "PRESENT",
    },
    dayType: {
      type: String,
      enum: ["Full Day", "Half Day"],
      default: "Full Day",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
