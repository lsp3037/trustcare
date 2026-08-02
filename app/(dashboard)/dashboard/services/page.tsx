'use client';
import { Wrench, AlertCircle, Plus } from 'lucide-react';

import React, { useEffect, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  SkeletonTable,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Textarea,
  Toolbar,
  ToolbarGroup,
  ToolbarSearch,
  TR,
  useConfirm,
  useToast,
} from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  company_id: string;
  nome: string;
  descricao: string;
  preco_padrao: number;
  ativo: boolean;
  created_at: string;
}

type Aba = 'todos' | 'ativos' | 'inativos';

export default function ServicesPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Aba>('todos');
  const [errorMsg, setErrorMsg] = useState('');

  // Formulário
  const [isOpen, setIsOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoPadrao, setPrecoPadrao] = useState('0.00');
  const [ativo, setAtivo] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const { data, error } = await supabase.from('services').select('*').order('nome');

      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar serviços:', err);
      setErrorMsg(err.message || 'Falha ao carregar catálogo de serviços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenCreate = () => {
    setEditingService(null);
    setNome('');
    setDescricao('');
    setPrecoPadrao('0.00');
    setAtivo(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setNome(service.nome);
    setDescricao(service.descricao || '');
    setPrecoPadrao(Number(service.preco_padrao || 0).toFixed(2));
    setAtivo(service.ativo);
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!nome.trim()) throw new Error('O nome do serviço é obrigatório.');
      const preco = parseFloat(precoPadrao);
      if (isNaN(preco) || preco < 0) {
        throw new Error('O preço padrão deve ser um número maior ou igual a zero.');
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Empresa não encontrada para este perfil.');

      const serviceData = {
        company_id: profile.company_id,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        preco_padrao: preco,
        ativo,
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);
        if (error) throw error;
        toast.success(`"${serviceData.nome}" atualizado`);
      } else {
        const { error } = await supabase.from('services').insert(serviceData);
        if (error) throw error;
        toast.success(`"${serviceData.nome}" cadastrado`);
      }

      setIsOpen(false);
      fetchServices();
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err);
      toast.error('Não foi possível salvar o serviço', {
        description: err.message || 'Erro ao persistir informações.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAtivo = async (service: Service) => {
    // Atualização otimista: o clique é no próprio badge, e esperar a ida ao
    // servidor faria o estado parecer travado.
    const proximoEstado = !service.ativo;
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, ativo: proximoEstado } : s)),
    );

    try {
      const { error } = await supabase
        .from('services')
        .update({ ativo: proximoEstado })
        .eq('id', service.id);

      if (error) throw error;

      toast.success(
        proximoEstado ? `"${service.nome}" ativado` : `"${service.nome}" inativado`,
        {
          description: proximoEstado
            ? undefined
            : 'Ele deixa de aparecer na hora de montar uma nova OS.',
        },
      );
    } catch (err: any) {
      // Desfaz a atualização otimista — o estado na tela precisa refletir o servidor.
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, ativo: service.ativo } : s)),
      );
      toast.error('Não foi possível alterar o status', {
        description: err.message || 'Erro inesperado.',
      });
    }
  };

  const handleDeleteService = async (service: Service) => {
    const confirmed = await confirm({
      title: `Excluir "${service.nome}" do catálogo?`,
      description:
        'Se houver ordens de serviço usando este serviço, a exclusão falha. Nesse caso, prefira inativá-lo: ele some das novas OS sem afetar o histórico.',
      confirmLabel: 'Excluir serviço',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('services').delete().eq('id', service.id);
      if (error) throw error;

      setServices((prev) => prev.filter((s) => s.id !== service.id));
      toast.success(`"${service.nome}" excluído`);
    } catch (err: any) {
      console.error('Erro ao deletar serviço:', err);
      toast.error('Este serviço não pode ser excluído', {
        description:
          'Ele está vinculado a ordens de serviço existentes. Inative-o para tirá-lo das novas OS.',
        action: {
          label: 'Inativar em vez disso',
          onClick: () => handleToggleAtivo(service),
        },
      });
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.descricao && s.descricao.toLowerCase().includes(searchTerm.toLowerCase()));

    if (activeTab === 'ativos') return matchesSearch && s.ativo;
    if (activeTab === 'inativos') return matchesSearch && !s.ativo;
    return matchesSearch;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Wrench />}
        title="Catálogo de Serviços"
        description="Gerencie a lista de serviços oferecidos na sua assistência técnica."
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
            Cadastrar Serviço
          </Button>
        }
      />

      <Toolbar>
        <ToolbarSearch
          aria-label="Buscar serviços"
          placeholder="Buscar por serviço ou descrição..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <ToolbarGroup>
          <SegmentedControl<Aba>
            label="Filtrar por status"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'ativos', label: 'Ativos' },
              { value: 'inativos', label: 'Inativos' },
            ]}
          />
        </ToolbarGroup>
      </Toolbar>

      {loading ? (
        <Card padding="none">
          <SkeletonTable rows={5} columns={4} />
        </Card>
      ) : errorMsg ? (
        <Card>
          <EmptyState
            icon={<AlertCircle className="text-danger" />}
            title="Erro ao carregar o catálogo"
            description={errorMsg}
            action={
              <Button variant="secondary" onClick={fetchServices}>
                Tentar novamente
              </Button>
            }
          />
        </Card>
      ) : filteredServices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench />}
            title={
              searchTerm || activeTab !== 'todos'
                ? 'Nenhum serviço com esses filtros'
                : 'Nenhum serviço cadastrado'
            }
            description={
              searchTerm || activeTab !== 'todos'
                ? 'Tente outra busca ou volte para a aba "Todos".'
                : 'Cadastre os serviços que você cobra com frequência. Eles ficam disponíveis para seleção ao montar uma OS.'
            }
            action={
              searchTerm || activeTab !== 'todos' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveTab('todos');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : (
                <Button icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
                  Cadastrar primeiro serviço
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <Table>
            <THead>
              <TR>
                <TH>Serviço</TH>
                <TH>Descrição</TH>
                <TH align="right">Preço Padrão</TH>
                <TH align="center">Status</TH>
                <TH align="center" className="w-12">
                  <span className="sr-only">Ações</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {filteredServices.map((service) => (
                <TR key={service.id}>
                  <TD className="font-semibold">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-1.5 rounded-2xl border border-glass-border shrink-0',
                          service.ativo
                            ? 'bg-info/10 text-info'
                            : 'bg-surface-sunken text-text-subtle',
                        )}
                        aria-hidden
                      >
                        <Wrench className="w-4 h-4" />
                      </div>
                      <span className={service.ativo ? '' : 'text-text-subtle'}>
                        {service.nome}
                      </span>
                    </div>
                  </TD>
                  <TD className="text-text-muted max-w-xs truncate">
                    {service.descricao || '—'}
                  </TD>
                  <TD align="right" numeric className="font-semibold">
                    R${' '}
                    {Number(service.preco_padrao).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </TD>
                  <TD align="center">
                    {/* O badge é o próprio controle de ativação — por isso é um
                        <button> com estado anunciado, não um rótulo clicável. */}
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(service)}
                      aria-pressed={service.ativo}
                      title={service.ativo ? 'Clique para inativar' : 'Clique para ativar'}
                      className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <Badge tone={service.ativo ? 'success' : 'neutral'}>
                        {service.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </button>
                  </TD>
                  <TD align="center">
                    <DropdownMenu label={`Ações do serviço ${service.nome}`}>
                      <DropdownMenuItem onSelect={() => handleOpenEdit(service)}>
                        Editar serviço
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleToggleAtivo(service)}>
                        {service.ativo ? 'Inativar serviço' : 'Ativar serviço'}
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => handleDeleteService(service)}>
                        Excluir serviço
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Cadastrar Serviço'}
        description={
          editingService
            ? 'Modifique os detalhes do serviço.'
            : 'Defina os detalhes do serviço padrão.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
            <Button type="submit" form="form-servico" loading={submitting}>
              Salvar Serviço
            </Button>
          </>
        }
      >
        <form id="form-servico" onSubmit={handleFormSubmit} className="space-y-5">
          <Input
            label="Nome do Serviço"
            required
            placeholder="Ex: Formatação de PC e Backup"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={submitting}
          />

          <Input
            label="Preço Padrão (R$)"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Ex: 150.00"
            value={precoPadrao}
            onChange={(e) => setPrecoPadrao(e.target.value)}
            disabled={submitting}
            className="font-mono tabular-nums"
          />

          <Textarea
            label="Descrição do Serviço"
            rows={4}
            placeholder="Descreva as etapas inclusas neste serviço padrão..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            disabled={submitting}
          />

          <Field
            label="Status do cadastro"
            hint="Inativo impede a seleção em novas Ordens de Serviço."
          >
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                disabled={submitting}
                className="w-4 h-4 shrink-0 rounded border-border bg-surface-sunken accent-brand cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              />
              <span className="text-small text-text">
                Serviço ativo no catálogo
              </span>
            </label>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
