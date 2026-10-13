import { format } from 'date-fns'
import { Check, Loader2, X, FileText, User } from 'lucide-react'
import React, { useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const LeaveHistory = ({ leaves = [], isAdmin, onUpdate, searchQuery = '', onFilterEmployee }) => {
  const [processing, setProcessing] = useState(null)

  const handleStatusUpdate = async (id, status) => {
    setProcessing(id)
    try {
      await api.patch(`/leave/${id}`, { status })
      toast.success(`Leave request marked as ${status}`)
      if (onUpdate) onUpdate()
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to update leave')
    } finally {
      setProcessing(null)
    }
  }

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'SICK':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
      case 'CASUAL':
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'
      case 'ANNUAL':
        return 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className='card overflow-hidden shadow-sm border border-slate-200/80'>
      <div className='overflow-x-auto'>
        <table className='table-modern'>
          <thead>
            <tr>
              {isAdmin && <th>Employee</th>}
              <th>Type</th>
              <th>Dates</th>
              <th>Reason</th>
              <th>Status</th>
              {isAdmin && <th className='text-center'>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 4} className='text-center py-16 text-slate-400'>
                  <div className='flex flex-col items-center justify-center max-w-sm mx-auto'>
                    <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400'>
                      <FileText className='w-6 h-6' />
                    </div>
                    <p className='text-base font-semibold text-slate-700'>
                      {searchQuery ? 'No matching leave requests' : 'No leave applications found'}
                    </p>
                    <p className='text-xs text-slate-400 mt-1'>
                      {searchQuery
                        ? `We couldn't find any leave records matching "${searchQuery}". Try a different search term or clear the filter.`
                        : 'No employee leave requests have been submitted yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              leaves.map((leave) => {
                const empName = `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.trim() || 'Employee'
                const initials = `${leave.employee?.firstName?.[0] || ''}${leave.employee?.lastName?.[0] || ''}` || 'EP'

                return (
                  <tr key={leave._id || leave.id} className='hover:bg-slate-50/60 transition-colors'>
                    {isAdmin && (
                      <td className='text-slate-900'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100'>
                            {initials}
                          </div>
                          <div className='min-w-0'>
                            <button
                              onClick={() => onFilterEmployee && onFilterEmployee(empName)}
                              title="Click to view only this employee's leaves"
                              className='font-semibold text-slate-900 hover:text-indigo-600 text-left transition-colors truncate block'
                            >
                              {empName}
                            </button>
                            <p className='text-xs text-slate-400 truncate'>
                              {leave.employee?.position || leave.employee?.department || 'Staff'}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}

                    <td>
                      <span className={`badge font-medium ${getTypeBadgeClass(leave.type)}`}>
                        {leave.type}
                      </span>
                    </td>

                    <td className='text-slate-600 font-medium whitespace-nowrap'>
                      {(() => {
                        try {
                          return `${format(new Date(leave.startDate), 'MMM dd')} - ${format(new Date(leave.endDate), 'MMM dd, yyyy')}`
                        } catch {
                          return `${leave.startDate} - ${leave.endDate}`
                        }
                      })()}
                    </td>

                    <td className='max-w-xs truncate text-slate-600' title={leave.reason}>
                      {leave.reason}
                    </td>

                    <td>
                      <span
                        className={`badge font-semibold ${
                          leave.status === 'APPROVED'
                            ? 'badge-success'
                            : leave.status === 'REJECTED'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </td>

                    {isAdmin && (
                      <td className='text-center'>
                        {leave.status === 'PENDING' ? (
                          <div className='flex justify-center items-center gap-2'>
                            <button
                              disabled={!!processing}
                              onClick={() => handleStatusUpdate(leave._id || leave.id, 'APPROVED')}
                              title='Approve leave'
                              className='p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50'
                            >
                              {processing === (leave._id || leave.id) ? (
                                <Loader2 className='w-4 h-4 animate-spin' />
                              ) : (
                                <Check className='w-4 h-4' />
                              )}
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(leave._id || leave.id, 'REJECTED')}
                              disabled={!!processing}
                              title='Reject leave'
                              className='p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50'
                            >
                              {processing === (leave._id || leave.id) ? (
                                <Loader2 className='w-4 h-4 animate-spin' />
                              ) : (
                                <X className='w-4 h-4' />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className='text-xs text-slate-400 italic'>Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LeaveHistory
