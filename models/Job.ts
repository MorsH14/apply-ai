import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    position: { type: String, required: true },
    status: { type: String, default: "saved" },
    location: String,
    salary: String,
    jobDescription: String,
    notes: String,
  },
  { timestamps: true },
);

export default mongoose.models.Job || mongoose.model("Job", JobSchema);
