import { useCallback, useEffect, useState } from "react"
import Loading from "../components/Loading"
import { 
  PalmtreeIcon, 
  PlusIcon, 
  ThermometerIcon, 
  UmbrellaIcon, 
  Search, 
  X, 
  Filter 
} from "lucide-react"
import LeaveHistory from "../components/leave/LeaveHistory"
import ApplyLeaveModal from "../components/leave/ApplyLeaveModal"
import { useAuth } from "../context/AuthContext"
import api from "../api/axios"
import toast from "react-hot-toast"

const Leave = () => {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  // Search and filter states
  const [search, setSearch] = useState("")
  const [selectedEmpFilter, setSelectedEmpFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const isAdmin = user?.role === "ADMIN"

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await api.get('/leave')
      setLeaves(res.data.data || [])
      if (res.data.employee?.isDeleted) setIsDeleted(true)
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  useEffect(() => {
    if (isAdmin) {
      api.get("/employees")
        .then((res) => setEmployees(res.data.filter((e) => !e.isDeleted)))
        .catch(() => {})
    }
  }, [isAdmin])

  // Filter leaves based on employee, status, and search query
  const filteredLeaves = leaves.filter((leave) => {
    // 1. Employee Dropdown Filter
    if (selectedEmpFilter) {
      const pEmpId = leave.employeeId || leave.employee?.id || leave.employee?._id
      if (pEmpId !== selectedEmpFilter) return false
    }

    // 2. Status Filter
    if (statusFilter !== "ALL") {
      if (leave.status !== statusFilter) return false
    }

    // 3. Text Search Query
    if (!search.trim()) return true
    const term = search.toLowerCase().trim()
    const fullName = `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.toLowerCase()
    const email = (leave.employee?.email || '').toLowerCase()
    const dept = (leave.employee?.department || '').toLowerCase()
    const position = (leave.employee?.position || '').toLowerCase()
    const reason = (leave.reason || '').toLowerCase()
    const type = (leave.type || '').toLowerCase()
    const status = (leave.status || '').toLowerCase()

    return (
      fullName.includes(term) ||
      email.includes(term) ||
      dept.includes(term) ||
      position.includes(term) ||
      reason.includes(term) ||
      type.includes(term) ||
      status.includes(term)
    )
  })

  const clearAllFilters = () => {
    setSearch("")
    setSelectedEmpFilter("")
    setStatusFilter("ALL")
  }

  const isFiltering = search.trim() !== "" || selectedEmpFilter !== "" || statusFilter !== "ALL"

  if (loading) return <Loading />

  const approvedLeaves = leaves.filter((l) => l.status === "APPROVED")
  const sickCount = approvedLeaves.filter((l) => l.type === "SICK").length
  const casualCount = approvedLeaves.filter((l) => l.type === "CASUAL").length
  const annualCount = approvedLeaves.filter((l) => l.type === "ANNUAL").length

  const leaveStats = [
    { label: "Sick Leave", value: sickCount, icon: ThermometerIcon },
    { label: "Casual Leave", value: casualCount, icon: UmbrellaIcon },
    { label: "Annual Leave", value: annualCount, icon: PalmtreeIcon },
  ]

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">
            {isAdmin ? "Manage and review employee leave requests" : "Your leave history and requests"}
          </p>
        </div>
        {!isAdmin && !isDeleted && (
          <button
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
            onClick={() => setShowModal(true)}
          >
            <PlusIcon className="w-4 h-4" /> Apply for Leave
          </button>
        )}
      </div>

      {/* Non-Admin Employee Leave Statistics */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-6">
          {leaveStats.map((s) => (
            <div
              key={s.label}
              className="card card-hover p-5 sm:p-6 flex items-center gap-4 relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500/70" />
              <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors duration-200">
                <s.icon className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors duration-200" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">
                  {s.value} <span className="text-sm font-normal text-slate-400">taken</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Bar & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder={
              isAdmin
                ? "Search leaves by employee name, reason, or type..."
                : "Search your leaves by type, reason, or status..."
            }
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Employee Dropdown Filter (Admin only) */}
        {isAdmin && employees.length > 0 && (
          <div className="sm:w-60">
            <select
              value={selectedEmpFilter}
              onChange={(e) => setSelectedEmpFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl shadow-xs py-2.5 text-sm"
            >
              <option value="">All Employees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id || emp._id} value={emp.id || emp._id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div className="sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl shadow-xs py-2.5 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Active Filter Notification Bar */}
      {isFiltering && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 mb-5 animate-fade-in">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              Showing <strong>{filteredLeaves.length}</strong> of {leaves.length} leave applications
              {search && <span> matching "<strong>{search}</strong>"</span>}
              {selectedEmpFilter && employees.find((e) => (e.id || e._id) === selectedEmpFilter) && (
                <span>
                  {" "}for{" "}
                  <strong>
                    {employees.find((e) => (e.id || e._id) === selectedEmpFilter).firstName}{" "}
                    {employees.find((e) => (e.id || e._id) === selectedEmpFilter).lastName}
                  </strong>
                </span>
              )}
              {statusFilter !== "ALL" && (
                <span> with status "<strong>{statusFilter}</strong>"</span>
              )}
            </span>
          </div>
          <button
            onClick={clearAllFilters}
            className="font-semibold text-indigo-700 hover:text-indigo-900 underline ml-2 shrink-0"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Leaves History Table */}
      <LeaveHistory 
        leaves={filteredLeaves} 
        isAdmin={isAdmin} 
        onUpdate={fetchLeaves}
        searchQuery={search}
        onFilterEmployee={(name) => setSearch(name)}
      />

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchLeaves}
      />
    </div>
  )
}

export default Leave