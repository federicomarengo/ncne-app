import CuponesTable from '../components/CuponesTable';

export default function CuponesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Cupones</h1>
          <p className="text-sm text-gray-600 mt-1">Administra los cupones mensuales generados</p>
        </div>
        <CuponesTable />
      </div>
    </div>
  );
}







