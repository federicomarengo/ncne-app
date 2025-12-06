'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cupon, ItemCupon, EstadoCupon } from '@/app/types/cupones';
import { getNombreCompleto } from '@/app/types/socios';
import { formatDate } from '@/app/utils/formatDate';
import { logger } from '@/app/utils/logger';

interface EditarCuponClientProps {
    cupon: Cupon;
}

export default function EditarCuponClient({ cupon }: EditarCuponClientProps) {
    const router = useRouter();
    const [items, setItems] = useState<ItemCupon[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editandoItem, setEditandoItem] = useState<ItemCupon | null>(null);
    const [nuevoItem, setNuevoItem] = useState(false);
    const [formData, setFormData] = useState({
        periodo_mes: cupon.periodo_mes.toString(),
        periodo_anio: cupon.periodo_anio.toString(),
        fecha_emision: cupon.fecha_emision ? new Date(cupon.fecha_emision).toISOString().split('T')[0] : '',
        fecha_vencimiento: cupon.fecha_vencimiento ? new Date(cupon.fecha_vencimiento).toISOString().split('T')[0] : '',
        monto_cuota_social: cupon.monto_cuota_social.toString(),
        monto_amarra: cupon.monto_amarra.toString(),
        monto_visitas: cupon.monto_visitas.toString(),
        monto_otros_cargos: cupon.monto_otros_cargos.toString(),
        monto_intereses: cupon.monto_intereses.toString(),
        monto_total: cupon.monto_total.toString(),
        estado: cupon.estado,
        fecha_pago: cupon.fecha_pago ? new Date(cupon.fecha_pago).toISOString().split('T')[0] : '',
        observaciones: cupon.observaciones || '',
    });
    const [itemFormData, setItemFormData] = useState({
        descripcion: '',
        cantidad: '1',
        precio_unitario: '',
        subtotal: '',
    });

    useEffect(() => {
        cargarItems();
    }, [cupon]);

    const cargarItems = async () => {
        setLoadingItems(true);
        try {
            const response = await fetch(`/api/cupones/${cupon.id}/items`);
            if (!response.ok) {
                throw new Error('Error al cargar items');
            }
            const data = await response.json();
            setItems(data.items || []);
        } catch (err) {
            logger.error('Error al cargar items:', err);
            setError('Error al cargar items del cupón');
        } finally {
            setLoadingItems(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error) setError(null);
    };

    const handleItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setItemFormData((prev) => {
            const newData = { ...prev, [name]: value };
            
            // Recalcular subtotal si cambia cantidad o precio unitario
            if (name === 'cantidad' || name === 'precio_unitario') {
                const cantidad = name === 'cantidad' ? parseFloat(value) : parseFloat(prev.cantidad);
                const precioUnitario = name === 'precio_unitario' ? parseFloat(value) : parseFloat(prev.precio_unitario || '0');
                newData.subtotal = (cantidad * precioUnitario).toFixed(2);
            }
            
            return newData;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validar fechas
            if (formData.fecha_vencimiento && formData.fecha_emision) {
                const fechaEmision = new Date(formData.fecha_emision);
                const fechaVencimiento = new Date(formData.fecha_vencimiento);
                if (fechaVencimiento < fechaEmision) {
                    throw new Error('La fecha de vencimiento no puede ser anterior a la fecha de emisión');
                }
            }

            // Recalcular total desde items si es necesario
            const totalItems = items.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0);
            const montoTotalForm = parseFloat(formData.monto_total);
            
            if (Math.abs(totalItems - montoTotalForm) > 0.01) {
                // Actualizar monto total con la suma de items
                setFormData(prev => ({ ...prev, monto_total: totalItems.toFixed(2) }));
            }

            const updateData: any = {
                periodo_mes: parseInt(formData.periodo_mes),
                periodo_anio: parseInt(formData.periodo_anio),
                fecha_emision: formData.fecha_emision,
                fecha_vencimiento: formData.fecha_vencimiento,
                monto_cuota_social: parseFloat(formData.monto_cuota_social),
                monto_amarra: parseFloat(formData.monto_amarra),
                monto_visitas: parseFloat(formData.monto_visitas),
                monto_otros_cargos: parseFloat(formData.monto_otros_cargos),
                monto_intereses: parseFloat(formData.monto_intereses),
                monto_total: parseFloat(formData.monto_total),
                estado: formData.estado,
                fecha_pago: formData.fecha_pago || null,
                observaciones: formData.observaciones.trim() || null,
            };

            const response = await fetch(`/api/cupones/${cupon.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar cupón');
            }

            router.push(`/cupones/${cupon.id}`);
            router.refresh();
        } catch (err: any) {
            logger.error('Error al actualizar cupón:', err);
            setError(err.message || 'Error al actualizar cupón');
        } finally {
            setLoading(false);
        }
    };

    const handleAgregarItem = () => {
        setNuevoItem(true);
        setEditandoItem(null);
        setItemFormData({
            descripcion: '',
            cantidad: '1',
            precio_unitario: '',
            subtotal: '',
        });
    };

    const handleEditarItem = (item: ItemCupon) => {
        setEditandoItem(item);
        setNuevoItem(false);
        setItemFormData({
            descripcion: item.descripcion,
            cantidad: item.cantidad.toString(),
            precio_unitario: item.precio_unitario ? item.precio_unitario.toString() : '',
            subtotal: item.subtotal.toString(),
        });
    };

    const handleGuardarItem = async () => {
        if (!itemFormData.descripcion.trim()) {
            setError('La descripción es obligatoria');
            return;
        }

        try {
            const itemData = {
                descripcion: itemFormData.descripcion.trim(),
                cantidad: parseInt(itemFormData.cantidad),
                precio_unitario: itemFormData.precio_unitario ? parseFloat(itemFormData.precio_unitario) : null,
                subtotal: parseFloat(itemFormData.subtotal || '0'),
            };

            let response;
            if (editandoItem) {
                // Actualizar item existente
                response = await fetch(`/api/cupones/${cupon.id}/items`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        item_id: editandoItem.id,
                        ...itemData,
                    }),
                });
            } else {
                // Crear nuevo item
                response = await fetch(`/api/cupones/${cupon.id}/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(itemData),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar item');
            }

            // Recargar items y actualizar total
            await cargarItems();
            
            // Actualizar monto total del formulario
            const responseItems = await fetch(`/api/cupones/${cupon.id}/items`);
            if (responseItems.ok) {
                const data = await responseItems.json();
                const nuevoTotal = data.items.reduce((sum: number, item: ItemCupon) => sum + parseFloat(item.subtotal.toString()), 0);
                setFormData(prev => ({ ...prev, monto_total: nuevoTotal.toFixed(2) }));
            }

            setNuevoItem(false);
            setEditandoItem(null);
            setItemFormData({
                descripcion: '',
                cantidad: '1',
                precio_unitario: '',
                subtotal: '',
            });
        } catch (err: any) {
            logger.error('Error al guardar item:', err);
            setError(err.message || 'Error al guardar item');
        }
    };

    const handleEliminarItem = async (itemId: number) => {
        if (!confirm('¿Está seguro de que desea eliminar este item?')) {
            return;
        }

        try {
            const response = await fetch(`/api/cupones/${cupon.id}/items?item_id=${itemId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar item');
            }

            // Recargar items y actualizar total
            await cargarItems();
            
            // Actualizar monto total del formulario
            const responseItems = await fetch(`/api/cupones/${cupon.id}/items`);
            if (responseItems.ok) {
                const data = await responseItems.json();
                const nuevoTotal = data.items.reduce((sum: number, item: ItemCupon) => sum + parseFloat(item.subtotal.toString()), 0);
                setFormData(prev => ({ ...prev, monto_total: nuevoTotal.toFixed(2) }));
            }
        } catch (err: any) {
            logger.error('Error al eliminar item:', err);
            setError(err.message || 'Error al eliminar item');
        }
    };

    const handleRecalcularTotal = () => {
        const total = items.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0);
        setFormData(prev => ({ ...prev, monto_total: total.toFixed(2) }));
    };

    const getEstadoBadgeClass = (estado: string) => {
        switch (estado) {
            case 'pendiente':
                return 'bg-yellow-100 text-yellow-800';
            case 'pagado':
                return 'bg-green-100 text-green-800';
            case 'vencido':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => router.push(`/cupones/${cupon.id}`)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        Volver al Detalle
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Editar Cupón {cupon.numero_cupon}</h1>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información del Cupón */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            Información del Cupón
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Número de Cupón
                                </label>
                                <p className="text-sm text-gray-900 font-medium">
                                    {cupon.numero_cupon}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Socio
                                </label>
                                <p className="text-sm text-gray-900">
                                    {cupon.socio ? `${cupon.socio.apellido}, ${cupon.socio.nombre}` : 'N/A'}
                                    {cupon.socio && (
                                        <span className="text-gray-500 ml-2">
                                            (Socio #{cupon.socio.numero_socio})
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Período Mes <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="periodo_mes"
                                    value={formData.periodo_mes}
                                    onChange={handleChange}
                                    min="1"
                                    max="12"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Período Año <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="periodo_anio"
                                    value={formData.periodo_anio}
                                    onChange={handleChange}
                                    min="2000"
                                    max="2100"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha de Emisión <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="fecha_emision"
                                    value={formData.fecha_emision}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha de Vencimiento <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="fecha_vencimiento"
                                    value={formData.fecha_vencimiento}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estado
                                </label>
                                <select
                                    name="estado"
                                    value={formData.estado}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="pagado">Pagado</option>
                                    <option value="vencido">Vencido</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha de Pago
                                </label>
                                <input
                                    type="date"
                                    name="fecha_pago"
                                    value={formData.fecha_pago}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Montos */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            Montos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cuota Social
                                </label>
                                <input
                                    type="number"
                                    name="monto_cuota_social"
                                    value={formData.monto_cuota_social}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amarra
                                </label>
                                <input
                                    type="number"
                                    name="monto_amarra"
                                    value={formData.monto_amarra}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Visitas
                                </label>
                                <input
                                    type="number"
                                    name="monto_visitas"
                                    value={formData.monto_visitas}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Otros Cargos
                                </label>
                                <input
                                    type="number"
                                    name="monto_otros_cargos"
                                    value={formData.monto_otros_cargos}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Intereses
                                </label>
                                <input
                                    type="number"
                                    name="monto_intereses"
                                    value={formData.monto_intereses}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">
                                    Monto Total
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        name="monto_total"
                                        value={formData.monto_total}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRecalcularTotal}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Recalcular
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items del Cupón */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Items del Cupón
                            </h3>
                            <button
                                type="button"
                                onClick={handleAgregarItem}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Agregar Item
                            </button>
                        </div>

                        {(nuevoItem || editandoItem) && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-3">
                                    {editandoItem ? 'Editar Item' : 'Nuevo Item'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Descripción <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            name="descripcion"
                                            value={itemFormData.descripcion}
                                            onChange={handleItemChange}
                                            required
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cantidad
                                        </label>
                                        <input
                                            type="number"
                                            name="cantidad"
                                            value={itemFormData.cantidad}
                                            onChange={handleItemChange}
                                            min="1"
                                            step="1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Precio Unitario
                                        </label>
                                        <input
                                            type="number"
                                            name="precio_unitario"
                                            value={itemFormData.precio_unitario}
                                            onChange={handleItemChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Subtotal
                                        </label>
                                        <input
                                            type="number"
                                            name="subtotal"
                                            value={itemFormData.subtotal}
                                            onChange={handleItemChange}
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        type="button"
                                        onClick={handleGuardarItem}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNuevoItem(false);
                                            setEditandoItem(null);
                                            setItemFormData({
                                                descripcion: '',
                                                cantidad: '1',
                                                precio_unitario: '',
                                                subtotal: '',
                                            });
                                        }}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        {loadingItems ? (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-500">Cargando items...</p>
                            </div>
                        ) : items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Descripción
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Cantidad
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Precio Unitario
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Subtotal
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {item.descripcion}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    {item.cantidad}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    {item.precio_unitario
                                                        ? formatCurrency(parseFloat(item.precio_unitario.toString()))
                                                        : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                                    {formatCurrency(parseFloat(item.subtotal.toString()))}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditarItem(item)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEliminarItem(item.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                Total:
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                                                {formatCurrency(items.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0))}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                                No hay items en este cupón
                            </p>
                        )}
                    </div>

                    {/* Observaciones */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                            Observaciones
                        </h3>
                        <textarea
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    {/* Botones de acción */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.push(`/cupones/${cupon.id}`)}
                            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

