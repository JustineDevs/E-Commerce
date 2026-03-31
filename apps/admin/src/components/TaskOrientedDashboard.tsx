"use client";

import { useEffect, useState } from "react";

type TaskItem = {
  id: string;
  type: "shipment_due" | "low_stock" | "open_return" | "pending_review" | "overdue_order";
  title: string;
  description: string;
  urgency: "high" | "medium" | "low";
  link: string;
  count?: number;
};

function urgencyColor(urgency: string) {
  switch (urgency) {
    case "high": return "border-l-red-500 bg-red-50";
    case "medium": return "border-l-yellow-500 bg-yellow-50";
    default: return "border-l-blue-500 bg-blue-50";
  }
}

function TaskCard({ task }: { task: TaskItem }) {
  return (
    <a
      href={task.link}
      className={`block border-l-4 rounded-r-lg p-4 hover:shadow-md transition-shadow ${urgencyColor(task.urgency)}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
        {task.count !== undefined && (
          <span className="bg-gray-900 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {task.count}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 mt-1">{task.description}</p>
    </a>
  );
}

export function TaskOrientedDashboard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/admin/tasks/today");
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks ?? []);
        }
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        All caught up. No urgent tasks for today.
      </div>
    );
  }

  const highPriority = tasks.filter((t) => t.urgency === "high");
  const other = tasks.filter((t) => t.urgency !== "high");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Today</h2>
        <span className="text-xs text-gray-500">{tasks.length} tasks pending</span>
      </div>
      {highPriority.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Requires attention</p>
          {highPriority.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
      {other.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Upcoming</p>
          {other.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
