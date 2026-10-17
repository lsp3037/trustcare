-- Migration: Adicionar coluna whatsapp à tabela profiles
-- Data: 2026-07-30

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Garantir que os profiles existentes continuem funcionando normalmente
-- (Nenhuma constraint restritiva adicionada por padrão)
