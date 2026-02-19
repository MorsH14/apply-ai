'use client';

import { useState, useEffect } from 'react';

// Define the Job type
type Job = {
  _id: string;
  company: string;
  position: string;
  status: string;
  createdAt: string;
};

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]); // Fix: specify the type
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');

  // Load jobs
  useEffect(() => {
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => setJobs(data));
  }, []);

  // Add job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, position, status: 'saved' })
    });

    const newJob = await res.json();
    setJobs([newJob, ...jobs]);
    setCompany('');
    setPosition('');
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Job Tracker</h1>

      {/* Add Job Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Job</h2>

        <input
          type="text"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <input
          type="text"
          placeholder="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />

        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          Add Job
        </button>
      </form>

      {/* Job List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Jobs ({jobs.length})</h2>

        {jobs.map((job) => (
          <div key={job._id} className="p-4 mb-4 border rounded-lg">
            <h3 className="font-bold text-lg">{job.position}</h3>
            <p className="text-gray-600">{job.company}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {job.status}
            </span>
          </div>
        ))}

        {jobs.length === 0 && (
          <p className="text-gray-500">No jobs yet. Add your first one above!</p>
        )}
      </div>
    </div>
  );
}