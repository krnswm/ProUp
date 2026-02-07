import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import MainLayout from '@/components/MainLayout';
import TaskQuickViewModal from '@/components/TaskQuickViewModal';
import { api } from '@/lib/api';

// FullCalendar event type - matches backend response from /api/calendar/tasks
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    description: string | null;
    assignedUser: string;
    status: string;
    priority: string;
    taskId: number;
    projectId: number | null;
    projectName: string | null;
    projectColor: string | null;
  };
}

// Project type for filter dropdown
interface Project {
  id: number;
  name: string;
  color: string;
  taskCount: number;
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<CalendarEvent | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  
  // Filter states
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Fetch calendar tasks and projects from backend
  useEffect(() => {
    fetchCalendarTasks();
    fetchProjects();
  }, []);

  // Apply filters whenever filter state changes
  useEffect(() => {
    applyFilters();
  }, [projectFilter, assigneeFilter, statusFilter, priorityFilter, events]);

  const fetchCalendarTasks = async () => {
    try {
      setLoading(true);
      const response = await api('/api/calendar/tasks');
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        
        // Extract unique assignees for filter dropdown
        const uniqueAssignees = Array.from(
          new Set(data.map((event: CalendarEvent) => event.extendedProps.assignedUser))
        ) as string[];
        setAssignees(uniqueAssignees.sort());
      }
    } catch (error) {
      console.error('Error fetching calendar tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects for filter dropdown
  const fetchProjects = async () => {
    try {
      const response = await api('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // Apply filters to events
  const applyFilters = () => {
    let filtered = [...events];

    // Project filter - filter by projectId
    if (projectFilter !== 'all') {
      if (projectFilter === 'none') {
        // Show tasks with no project assigned
        filtered = filtered.filter(
          (event) => event.extendedProps.projectId === null
        );
      } else {
        filtered = filtered.filter(
          (event) => event.extendedProps.projectId === parseInt(projectFilter)
        );
      }
    }

    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(
        (event) => event.extendedProps.assignedUser === assigneeFilter
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (event) => event.extendedProps.status === statusFilter
      );
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(
        (event) => event.extendedProps.priority === priorityFilter
      );
    }

    setFilteredEvents(filtered);
  };

  // Handle event click - open quick view modal
  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.startStr,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      extendedProps: event.extendedProps,
    };
    
    setSelectedTask(calendarEvent);
    setIsQuickViewOpen(true);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setProjectFilter('all');
    setAssigneeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Global Calendar</h1>
          <p className="text-muted-foreground mt-2">
            View all tasks from every project in one calendar
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Filters</h2>
            <button
              onClick={handleResetFilters}
              className="text-sm text-primary hover:underline"
            >
              Reset All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Project
              </label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Projects</option>
                <option value="none">No Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.name} ({project.taskCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Assigned To
              </label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Users</option>
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredEvents.length} of {events.length} tasks
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-card border border-border rounded-lg p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading calendar...</div>
            </div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={filteredEvents}
              eventClick={handleEventClick}
              height="auto"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek',
              }}
              eventDisplay="block"
              displayEventTime={false}
              dayMaxEvents={3}
              moreLinkText="more"
              // Custom styling
              themeSystem="standard"
            />
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Priority Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-foreground">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-sm text-foreground">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-foreground">Low Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-500"></div>
              <span className="text-sm text-foreground">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {selectedTask && (
        <TaskQuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => {
            setIsQuickViewOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
        />
      )}
    </MainLayout>
  );
}
