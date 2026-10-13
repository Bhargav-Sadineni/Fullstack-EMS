import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  FileText, 
  Pencil, 
  Trash2, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import toast from 'react-hot-toast';

const EmployeeDetailModal = ({ employee, isOpen, onClose, onEdit, onDeleteSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !employee) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/employees/${employee.id || employee._id}`);
      toast.success(`${employee.firstName} ${employee.lastName} has been deleted`);
      setShowDeleteConfirm(false);
      onClose();
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = () => {
    onClose();
    if (onEdit) onEdit(employee);
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const netSalary = Number(employee.basicSalary || 0) + Number(employee.allowances || 0) - Number(employee.deductions || 0);

  const formattedJoinDate = employee.joinDate
    ? (() => {
        try {
          return format(new Date(employee.joinDate), 'MMMM dd, yyyy');
        } catch {
          return new Date(employee.joinDate).toLocaleDateString();
        }
      })()
    : 'Not specified';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Banner & Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 p-6 pt-8 text-white rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar Initials */}
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl font-bold shadow-lg text-white shrink-0">
              {employee.firstName?.[0]?.toUpperCase() || ''}{employee.lastName?.[0]?.toUpperCase() || ''}
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h2 className="text-2xl font-bold tracking-tight text-white truncate">
                  {employee.firstName} {employee.lastName}
                </h2>
                {employee.isDeleted ? (
                  <span className="bg-rose-500/80 text-white text-xs px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                    DELETED
                  </span>
                ) : (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shadow-sm ${
                    employee.employmentStatus === 'ACTIVE' 
                      ? 'bg-emerald-500/80 text-white' 
                      : 'bg-amber-500/80 text-white'
                  }`}>
                    {employee.employmentStatus || 'ACTIVE'}
                  </span>
                )}
              </div>

              <p className="text-indigo-100 text-sm font-medium mb-2">
                {employee.position || 'Employee'} &bull; <span className="text-indigo-200">{employee.department || 'General'}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-indigo-100/90">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {employee.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* Delete Confirmation Alert if active */}
          {showDeleteConfirm && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div className="flex-1 text-sm text-rose-800">
                  <p className="font-semibold text-rose-900">Are you sure you want to delete this employee?</p>
                  <p className="mt-1 text-xs text-rose-700">
                    This will mark {employee.firstName} {employee.lastName} as deleted and set status to Inactive.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3.5 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-200 text-xs font-medium rounded-lg hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Contact & Employment Information */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-500" /> Employment & Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Department</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5">{employee.department || 'Not Assigned'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Position / Role</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5">{employee.position || 'Staff'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Work Email</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{employee.email}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Phone Number</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5">{employee.phone || 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Date of Joining</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5">{formattedJoinDate}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col">
                <span className="text-xs text-slate-400 font-medium">Employment Status</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${employee.employmentStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {employee.employmentStatus || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Compensation & Salary Structure */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Compensation & Payroll Structure
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col">
                <span className="text-xs text-emerald-700 font-medium">Basic Salary</span>
                <span className="text-base font-bold text-emerald-950 mt-1">
                  {formatCurrency(employee.basicSalary)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col">
                <span className="text-xs text-blue-700 font-medium">Allowances</span>
                <span className="text-base font-bold text-blue-950 mt-1">
                  +{formatCurrency(employee.allowances)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 flex flex-col">
                <span className="text-xs text-rose-700 font-medium">Deductions</span>
                <span className="text-base font-bold text-rose-950 mt-1">
                  -{formatCurrency(employee.deductions)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col">
                <span className="text-xs text-indigo-700 font-medium">Net Monthly</span>
                <span className="text-base font-bold text-indigo-950 mt-1">
                  {formatCurrency(netSalary)}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Biography / Notes */}
          {employee.bio && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" /> Biography & Notes
              </h3>
              <p className="text-sm text-slate-600 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                {employee.bio}
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Delete Option */}
          <div>
            {!showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Employee
              </button>
            )}
          </div>

          {/* Edit and Close Options */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleEditClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.01]"
            >
              <Pencil className="w-4 h-4" />
              Edit Employee
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmployeeDetailModal;
