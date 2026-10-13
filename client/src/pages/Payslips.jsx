import { useCallback, useEffect, useState } from "react"
import { Search, X, Filter, Users } from "lucide-react"
import Loading from "../components/Loading"
import PayslipList from "../components/payslip/PayslipList"
import GeneratePayslipForm from "../components/payslip/GeneratePayslipForm"
import { useAuth } from "../context/AuthContext"
import api from "../api/axios"
import toast from "react-hot-toast"

const Payslips = () => {
  const [payslips, setPayslips] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedEmpFilter, setSelectedEmpFilter] = useState("")
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN"

  const fetchPayslips = useCallback(async () => {
    try {
      const res = await api.get('/payslips')
      setPayslips(res.data.data || [])
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayslips()
  }, [fetchPayslips])

  useEffect(() => {
    if (isAdmin) {
      api.get("/employees")
        .then((res) => setEmployees(res.data.filter((e) => !e.isDeleted)))
        .catch(() => {})
    }
  }, [isAdmin])

  // Filter payslips based on search term or selected employee
  const filteredPayslips = payslips.filter((payslip) => {
    // Dropdown filter
    if (selectedEmpFilter) {
      const pEmpId = payslip.employeeId || payslip.employee?.id || payslip.employee?._id
      if (pEmpId !== selectedEmpFilter) return false
    }

    // Text search filter
    if (!search.trim()) return true
    const term = search.toLowerCase().trim()
    const fullName = `${payslip.employee?.firstName || ''} ${payslip.employee?.lastName || ''}`.toLowerCase()
    const email = (payslip.employee?.email || '').toLowerCase()
    const position = (payslip.employee?.position || '').toLowerCase()
    const department = (payslip.employee?.department || '').toLowerCase()
    const period = `${payslip.month} ${payslip.year}`.toLowerCase()

    return fullName.includes(term) || email.includes(term) || position.includes(term) || department.includes(term) || period.includes(term)
  })

  const clearAllFilters = () => {
    setSearch("")
    setSelectedEmpFilter("")
  }

  const isFiltering = search.trim() !== "" || selectedEmpFilter !== ""

  if (loading) return <Loading />

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Payslips</h1>
          <p className="page-subtitle">
            {isAdmin ? "Generate and manage employee payslips" : "Your payslip history"}
          </p>
        </div>

        {isAdmin && <GeneratePayslipForm employees={employees} onSuccess={fetchPayslips} />}
      </div>

      {/* Admin Search Bar & Employee Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder={
              isAdmin 
                ? "Search payslips by employee name, position, or department..." 
                : "Search your payslips by month or year..."
            }
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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

        {/* Admin Employee Quick Dropdown */}
        {isAdmin && employees.length > 0 && (
          <div className="sm:w-64">
            <select
              value={selectedEmpFilter}
              onChange={(e) => setSelectedEmpFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl shadow-xs py-2.5"
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
      </div>

      {/* Active Filter Notification Bar */}
      {isFiltering && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 mb-5 animate-fade-in">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              Showing <strong>{filteredPayslips.length}</strong> of {payslips.length} payslips
              {search && <span> matching "<strong>{search}</strong>"</span>}
              {selectedEmpFilter && employees.find(e => (e.id || e._id) === selectedEmpFilter) && (
                <span> for <strong>{employees.find(e => (e.id || e._id) === selectedEmpFilter).firstName} {employees.find(e => (e.id || e._id) === selectedEmpFilter).lastName}</strong></span>
              )}
            </span>
          </div>
          <button
            onClick={clearAllFilters}
            className="font-semibold text-indigo-700 hover:text-indigo-900 underline ml-2"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Payslips Table */}
      <PayslipList 
        payslips={filteredPayslips} 
        isAdmin={isAdmin} 
        searchQuery={search}
        onFilterEmployee={(name) => setSearch(name)}
      />
    </div>
  )
}

export default Payslips
