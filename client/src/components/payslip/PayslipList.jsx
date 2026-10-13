import { format } from 'date-fns'
import { Download, FileText, Search, User } from 'lucide-react'
import React from 'react'

const PayslipList = ({ payslips = [], isAdmin, searchQuery = '', onFilterEmployee }) => {
  return (
    <div className='card overflow-hidden shadow-sm border border-slate-200/80'>
      <div className='overflow-x-auto'>
        <table className='table-modern'>
          <thead>
            <tr>
              {isAdmin && <th>Employee</th>}
              <th>Period</th>
              <th>Basic Salary</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Net Salary</th>
              <th className='text-center'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payslips.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className='text-center py-16 text-slate-400'>
                  <div className='flex flex-col items-center justify-center max-w-sm mx-auto'>
                    <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400'>
                      <FileText className='w-6 h-6' />
                    </div>
                    <p className='text-base font-semibold text-slate-700'>
                      {searchQuery ? 'No matching payslips found' : 'No payslips found'}
                    </p>
                    <p className='text-xs text-slate-400 mt-1'>
                      {searchQuery 
                        ? `We couldn't find any payslips matching "${searchQuery}". Try searching with a different name or clear the filter.` 
                        : 'No payslip records have been generated yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              payslips.map((payslip) => {
                const empName = `${payslip.employee?.firstName || ''} ${payslip.employee?.lastName || ''}`.trim() || 'Employee'
                const initials = `${payslip.employee?.firstName?.[0] || ''}${payslip.employee?.lastName?.[0] || ''}` || 'EP'

                return (
                  <tr key={payslip._id || payslip.id} className='hover:bg-slate-50/60 transition-colors'>
                    {isAdmin && (
                      <td className='text-slate-900'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100'>
                            {initials}
                          </div>
                          <div className='min-w-0'>
                            <button
                              onClick={() => onFilterEmployee && onFilterEmployee(empName)}
                              title="Click to view only this employee's payslips"
                              className='font-semibold text-slate-900 hover:text-indigo-600 text-left transition-colors truncate block'
                            >
                              {empName}
                            </button>
                            <p className='text-xs text-slate-400 truncate'>
                              {payslip.employee?.position || payslip.employee?.department || 'Staff'}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className='text-slate-600 font-medium'>
                      {(() => {
                        try {
                          return format(new Date(payslip.year, payslip.month - 1), "MMMM yyyy")
                        } catch {
                          return `${payslip.month}/${payslip.year}`
                        }
                      })()}
                    </td>

                    <td className='text-slate-600'>
                      ${Number(payslip.basicSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className='text-emerald-600 text-xs font-medium'>
                      +${Number(payslip.allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className='text-rose-600 text-xs font-medium'>
                      -${Number(payslip.deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className='font-bold text-slate-900'>
                      ${Number(payslip.netSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className='text-center'>
                      <button
                        onClick={() => window.open(`/print/payslips/${payslip._id || payslip.id}`)}
                        className='inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors ring-1 ring-indigo-600/10'
                      >
                        <Download className='w-3.5 h-3.5 mr-1.5' />
                        Download
                      </button>
                    </td>
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

export default PayslipList
