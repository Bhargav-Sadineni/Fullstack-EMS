import { PencilIcon, Trash2Icon } from "lucide-react"
import api from "../api/axios";
import toast from "react-hot-toast";


const EmployeeCard = ({ employee, onDelete, onEdit, onViewDetails }) => {

    const handleDelete = async (e) => {
        if (e) e.stopPropagation();
        if (!confirm("Are you sure you want to delete this employee?"))
            return;
        try {
            await api.delete(`/employees/${employee.id || employee._id}`)
            onDelete()
        } catch (err) {
            toast.error(err.response?.data?.error || err.message);
        }
    }

    const handleEdit = (e) => {
        if (e) e.stopPropagation();
        onEdit(employee);
    }

    const handleCardClick = () => {
        if (onViewDetails) {
            onViewDetails(employee);
        }
    }

  return (
    <div 
      onClick={handleCardClick}
      className='group relative card card-hover overflow-hidden cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all duration-200'>
      <div className="relative aspect-4/3 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-indigo-50/40">
        <div className='w-full h-full flex items-center justify-center'>
            {/*circle icons*/}
            <div className='w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-inner'>
                <span className='text-2xl font-semibold text-indigo-500'>
                    {employee.firstName?.[0]} {employee.lastName?.[0]}
                </span>
            </div>
        </div>
      </div>

      <div className='absolute top-3 left-3 flex gap-2'>
       <span className='bg-white/95 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-slate-700 rounded-lg shadow-sm border border-slate-100'>
         {employee.department || "Remote"}
       </span>

       {employee.isDeleted && (
         <span className='bg-rose-500 font-medium text-white px-2.5 py-1 text-xs rounded shadow-sm'>
           DELETED
         </span>
       )}
      </div>

      {!employee.isDeleted && (
        <div className='absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4'>
          <span className="text-white text-xs font-medium tracking-wide bg-slate-900/40 backdrop-blur-sm px-2.5 py-1 rounded-md">
            Click to view details
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              title="Edit employee"
              className='p-2 bg-white text-slate-700 hover:text-indigo-600 rounded-lg shadow-md transition-all hover:scale-110'>
              <PencilIcon className='w-3.5 h-3.5' />
            </button>
            <button
              onClick={handleDelete}
              title="Delete employee"
              className='p-2 bg-white text-slate-700 hover:text-rose-600 rounded-lg shadow-md transition-all hover:scale-110 disabled:opacity-50'>
              <Trash2Icon className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      )}

      <div className='p-5'>
        <h3 className='font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors'>
          {employee.firstName} {employee.lastName}
        </h3>

        <p className='text-xs text-slate-500 mt-0.5'>
          {employee.position}
        </p>

        {employee.basicSalary ? (
          <p className='text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1'>
            <span>${Number(employee.basicSalary).toLocaleString()}</span>
            <span className='text-[10px] text-slate-400 font-normal'>/ mo</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default EmployeeCard