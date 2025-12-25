import React from 'react';
import { Building2, Activity, Users, Clock, AlertCircle, Ambulance } from 'lucide-react';
import { SimulationStatus } from '../types';

interface HospitalViewProps {
  status: SimulationStatus;
}

interface Patient {
  id: string;
  name: string;
  condition: string;
  vehicle: string;
  eta: string;
  statusLabel: string;
  statusColor: string;
  isNew?: boolean;
  alert?: boolean;
}

export const HospitalView: React.FC<HospitalViewProps> = ({ status }) => {

  // Prepare data for rendering to support both Mobile (Card) and Desktop (Table) views nicely
  const patients: Patient[] = [
    { 
        id: 'P-4421', 
        name: 'Sarah Jenkins', 
        condition: 'Fracture (Right Leg)', 
        vehicle: 'MH-02-8822', 
        eta: '15 mins', 
        statusLabel: 'En Route', 
        statusColor: 'yellow' 
    },
    { 
        id: 'P-1102', 
        name: 'Michael Ross', 
        condition: 'High Fever', 
        vehicle: 'MH-01-3311', 
        eta: 'Arrived', 
        statusLabel: 'Admitted', 
        statusColor: 'green' 
    },
  ];

  const incomingPatient: Patient | null = status === 'accepted' ? {
      id: 'TMP-9921',
      name: 'Unknown (Male, 30s)',
      condition: 'Cardiac / Critical',
      vehicle: 'MH-04-1234',
      eta: '8 mins',
      statusLabel: 'En Route',
      statusColor: 'yellow',
      isNew: true,
      alert: true
  } : null;

  const allPatients = incomingPatient ? [incomingPatient, ...patients] : patients;

  const renderStatusBadge = (p: Patient) => {
      if (p.statusColor === 'yellow') {
          return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold border border-yellow-200">{p.statusLabel}</span>;
      }
      return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold border border-green-200">{p.statusLabel}</span>;
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
       {/* Top Nav */}
       <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
           <div className="flex items-center gap-2 sm:gap-3">
               <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                   <Building2 size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
               </div>
               <h1 className="text-lg sm:text-xl font-bold text-gray-800">City General</h1>
           </div>
           <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm">
               <div className="hidden sm:flex items-center gap-2 text-gray-600">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                   Systems Normal
               </div>
               <div className="flex items-center gap-2 text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                   {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </div>
           </div>
       </div>

       <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
           
           {/* Stats Cards - Horizontal Scroll on very small screens if needed, otherwise stack/grid */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <Activity size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">3</div>
                        <div className="text-sm text-gray-500">Critical Alerts</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">12</div>
                        <div className="text-sm text-gray-500">Available Beds</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                        <Ambulance size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">5</div>
                        <div className="text-sm text-gray-500">Inbound Units</div>
                    </div>
                </div>
           </div>

           {/* Content Area */}
           <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-gray-800">Incoming Patients</h2>
                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">Live Feed</span>
                </div>

                {/* MOBILE VIEW: Card Layout (Visible < md) */}
                <div className="block md:hidden space-y-3">
                    {allPatients.map((p, i) => (
                        <div key={i} className={`bg-white p-4 rounded-xl border shadow-sm ${p.isNew ? 'border-l-4 border-l-red-500 animate-in slide-in-from-left' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-bold text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-500">ID: {p.id}</div>
                                </div>
                                {renderStatusBadge(p)}
                            </div>
                            
                            <div className="space-y-2 mb-3">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    {p.alert ? <AlertCircle size={16} className="text-red-500" /> : <Activity size={16} className="text-gray-400" />}
                                    <span className={p.alert ? 'font-medium text-red-600' : ''}>{p.condition}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                                    <Ambulance size={14} />
                                    <span className="font-mono">{p.vehicle}</span>
                                    <span className="text-gray-300">|</span>
                                    <Clock size={14} className={p.isNew ? 'text-orange-500' : ''} />
                                    <span className={p.isNew ? 'text-orange-600 font-bold' : ''}>{p.eta}</span>
                                </div>
                            </div>
                            
                            <button className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                View Vitals & History
                            </button>
                        </div>
                    ))}
                </div>

                {/* DESKTOP VIEW: Table Layout (Visible >= md) */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-3 font-semibold">Patient Profile</th>
                                    <th className="px-6 py-3 font-semibold">Condition</th>
                                    <th className="px-6 py-3 font-semibold">Vehicle / ETA</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {allPatients.map((p, i) => (
                                    <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 transition ${p.isNew ? 'bg-red-50/50 animate-in slide-in-from-left border-l-4 border-l-red-500' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{p.name}</div>
                                            <div className="text-xs text-gray-500">ID: {p.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-2 ${p.alert ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                                                {p.alert && <AlertCircle size={16} />}
                                                {p.condition}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            <div className="font-mono">{p.vehicle}</div>
                                            <div className={`text-xs flex items-center gap-1 ${p.isNew ? 'text-orange-600 font-bold' : ''}`}>
                                                 {p.isNew && <Clock size={12} />} {p.eta}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {renderStatusBadge(p)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">View Vitals</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
           </div>
       </div>
    </div>
  );
};