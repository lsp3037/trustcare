'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useOrderForm } from '@/components/hooks/useOrderForm';
import { ClientSection } from '@/components/new-order/ClientSection';
import { EquipmentSection } from '@/components/new-order/EquipmentSection';
import { ProblemSection } from '@/components/new-order/ProblemSection';
import { ItemsSection } from '@/components/new-order/ItemsSection';
import { FinancialSection } from '@/components/new-order/FinancialSection';
import { ClientModal } from '@/components/new-order/ClientModal';
import { ProductModal } from '@/components/new-order/ProductModal';

interface NewOrderFormProps {
  clients: any[];
  onSuccess?: () => void;
}

export default function NewOrderForm({ clients, onSuccess }: NewOrderFormProps) {
  const orderForm = useOrderForm({ clients, onSuccess });

  return (
    <>
      <form onSubmit={orderForm.handleSubmit} className="space-y-6 text-slate-200">
        {orderForm.success && (
          <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-semibold text-sm">Ordem de Serviço aberta com sucesso!</p>
          </div>
        )}

        {orderForm.errorMsg && (
          <div className="p-4 rounded-none bg-rose-500/10 border border-rose-500/25 text-rose-450 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold">{orderForm.errorMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Informações Iniciais
            </h3>

            <ClientSection
              clientId={orderForm.clientId}
              setClientId={orderForm.setClientId}
              setIsNewClientModalOpen={orderForm.setIsNewClientModalOpen}
              clientsList={orderForm.clientsList}
              queryClientId={orderForm.queryClientId}
            />

            <EquipmentSection
              clientId={orderForm.clientId}
              equipmentId={orderForm.equipmentId}
              setEquipmentId={orderForm.setEquipmentId}
              equipments={orderForm.equipments}
              queryEquipmentId={orderForm.queryEquipmentId}
              isManualEquipment={orderForm.isManualEquipment}
              equipmentDetails={orderForm.equipmentDetails}
              setEquipmentDetails={orderForm.setEquipmentDetails}
            />
          </div>

          <ProblemSection
            status={orderForm.status}
            setStatus={orderForm.setStatus}
            priority={orderForm.priority}
            setPriority={orderForm.setPriority}
            technicianId={orderForm.technicianId}
            setTechnicianId={orderForm.setTechnicianId}
            technicians={orderForm.technicians}
            deliveryPrediction={orderForm.deliveryPrediction}
            setDeliveryPrediction={orderForm.setDeliveryPrediction}
            serviceValue={orderForm.serviceValue}
            setServiceValue={orderForm.setServiceValue}
            discount={orderForm.discount}
            setDiscount={orderForm.setDiscount}
            reportedProblem={orderForm.reportedProblem}
            setReportedProblem={orderForm.setReportedProblem}
          />
        </div>

        <ItemsSection
          inventory={orderForm.inventory}
          currentProductId={orderForm.currentProductId}
          setCurrentProductId={orderForm.setCurrentProductId}
          setIsNewProductModalOpen={orderForm.setIsNewProductModalOpen}
          currentProductQty={orderForm.currentProductQty}
          setCurrentProductQty={orderForm.setCurrentProductQty}
          productAddError={orderForm.productAddError}
          setProductAddError={orderForm.setProductAddError}
          handleAddProduct={orderForm.handleAddProduct}
          selectedProducts={orderForm.selectedProducts}
          handleRemoveProduct={orderForm.handleRemoveProduct}
          availableServices={orderForm.availableServices}
          currentServiceId={orderForm.currentServiceId}
          handleServiceSelect={orderForm.handleServiceSelect}
          currentServiceQty={orderForm.currentServiceQty}
          setCurrentServiceQty={orderForm.setCurrentServiceQty}
          currentServicePrice={orderForm.currentServicePrice}
          setCurrentServicePrice={orderForm.setCurrentServicePrice}
          handleAddService={orderForm.handleAddService}
          selectedServices={orderForm.selectedServices}
          handleRemoveService={orderForm.handleRemoveService}
        />

        <FinancialSection
          subtotalValue={orderForm.subtotalValue}
          discount={orderForm.discount}
          totalValue={orderForm.totalValue}
          loading={orderForm.loading}
        />
      </form>

      <ClientModal
        isNewClientModalOpen={orderForm.isNewClientModalOpen}
        setIsNewClientModalOpen={orderForm.setIsNewClientModalOpen}
        clientModalStep={orderForm.clientModalStep}
        setClientModalStep={orderForm.setClientModalStep}
        clientModalError={orderForm.clientModalError}
        setClientModalError={orderForm.setClientModalError}
        newClientType={orderForm.newClientType}
        setNewClientType={orderForm.setNewClientType}
        newClientName={orderForm.newClientName}
        setNewClientName={orderForm.setNewClientName}
        newClientDoc={orderForm.newClientDoc}
        setNewClientDoc={orderForm.setNewClientDoc}
        newClientPhone={orderForm.newClientPhone}
        setNewClientPhone={orderForm.setNewClientPhone}
        newClientEmail={orderForm.newClientEmail}
        setNewClientEmail={orderForm.setNewClientEmail}
        newEqName={orderForm.newEqName}
        setNewEqName={orderForm.setNewEqName}
        newEqBrand={orderForm.newEqBrand}
        setNewEqBrand={orderForm.setNewEqBrand}
        newEqModel={orderForm.newEqModel}
        setNewEqModel={orderForm.setNewEqModel}
        newEqSerial={orderForm.newEqSerial}
        setNewEqSerial={orderForm.setNewEqSerial}
        savingClient={orderForm.savingClient}
        handleSaveClient={orderForm.handleSaveClient}
        handleNextStep={orderForm.handleNextStep}
      />

      <ProductModal
        isNewProductModalOpen={orderForm.isNewProductModalOpen}
        setIsNewProductModalOpen={orderForm.setIsNewProductModalOpen}
        productModalError={orderForm.productModalError}
        newProdName={orderForm.newProdName}
        setNewProdName={orderForm.setNewProdName}
        newProdCategory={orderForm.newProdCategory}
        setNewProdCategory={orderForm.setNewProdCategory}
        newProdBrand={orderForm.newProdBrand}
        setNewProdBrand={orderForm.setNewProdBrand}
        newProdCapacity={orderForm.newProdCapacity}
        setNewProdCapacity={orderForm.setNewProdCapacity}
        newProdSsdTech={orderForm.newProdSsdTech}
        setNewProdSsdTech={orderForm.setNewProdSsdTech}
        newProdSsdGb={orderForm.newProdSsdGb}
        setNewProdSsdGb={orderForm.setNewProdSsdGb}
        newProdRamApp={orderForm.newProdRamApp}
        setNewProdRamApp={orderForm.setNewProdRamApp}
        newProdRamTech={orderForm.newProdRamTech}
        setNewProdRamTech={orderForm.setNewProdRamTech}
        newProdRamSpeed={orderForm.newProdRamSpeed}
        setNewProdRamSpeed={orderForm.setNewProdRamSpeed}
        newProdRamGb={orderForm.newProdRamGb}
        setNewProdRamGb={orderForm.setNewProdRamGb}
        newProdSalePrice={orderForm.newProdSalePrice}
        setNewProdSalePrice={orderForm.setNewProdSalePrice}
        newProdQty={orderForm.newProdQty}
        setNewProdQty={orderForm.setNewProdQty}
        savingProduct={orderForm.savingProduct}
        handleSaveProduct={orderForm.handleSaveProduct}
      />
    </>
  );
}
