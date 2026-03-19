const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', '(dashboard)', 'precatorios', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const importStmt = 'import "./precatorios-layout.css"';
if (!content.includes(importStmt)) {
    content = content.replace(
        'import { SearchBar } from "@/components/precatorios/search-bar"', 
        'import "./precatorios-layout.css"\nimport { SearchBar } from "@/components/precatorios/search-bar"'
    );
}

if (!content.slice(0, 1000).includes('Search') && content.includes('import { ')) {
    content = content.replace(
        'import { Plus, Trash2, X, FileJson, Loader2, Filter, FileText, MoreVertical, LayoutGrid, List }',
        'import { Plus, Trash2, X, FileJson, Loader2, Filter, FileText, MoreVertical, LayoutGrid, List, Search }'
    );
}

const splitStr = "  if (loading && !initialized) {";
const parts = content.split(splitStr);

const beforeReturn = parts[0] + splitStr + parts[1].split("\n  return (")[0];

const newReturn = `
  return (
    <div className="page">
      {/* 1. HERO HEADER */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-top">
            <div>
              <div className="hero-label">Carteira ativa</div>
              <h1 className="hero-title">Precatórios</h1>
              <p className="hero-desc">Gerencie a carteira com visão operacional clara, atalhos rápidos e filtros inteligentes.</p>
            </div>
            <div className="hero-actions">
              <button className="btn btn-outline" onClick={() => setImportJsonOpen(true)}>
                <span className="btn-icon"><FileJson className="w-4 h-4"/></span> Importar JSON
              </button>
              <button className="btn btn-primary" onClick={() => router.push("/precatorios/novo")}>
                <span className="btn-icon"><Plus className="w-4 h-4" /></span> Novo Precatório
              </button>
            </div>
          </div>

          <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="kpi kpi-default">
              <div className="kpi-label">Total</div>
              <div className="kpi-value">{totalPrecatorios}</div>
              <div className="kpi-sub">precatórios na carteira</div>
            </div>
            <div className="kpi kpi-green">
              <div className="kpi-label">Calculados</div>
              <div className="kpi-value">{calculadosCount}</div>
              <div className="kpi-sub">cálculo concluído</div>
            </div>
            <div className="kpi kpi-orange">
              <div className="kpi-label">Em cálculo / Novo</div>
              <div className="kpi-value">{emCalculoOuNovoCount}</div>
              <div className="kpi-sub">em andamento / novo</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar-row">
          <div className="search-wrap">
            <span className="search-icon"><Search className="w-4 h-4" /></span>
            <input 
              className="search-input" 
              placeholder="Busque por título, número, credor ou processo..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setTermo(searchInput)}
            />
          </div>
          
          <select 
            className="select-pill"
            value={statusSelectValue}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
          >
            <option value="todos">Todos os status</option>
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>

          {/* Advanced Filters keeps its internal button */}
          <AdvancedFilters
            filtros={filtros}
            onFilterChange={updateFiltros}
            onClearFilters={handleClearAllFiltros}
            totalFiltrosAtivos={filtrosAtivos.length + (filtros.responsavel_id ? 1 : 0)}
            responsaveis={responsaveis}
            showResponsavelFilter={!!userRole?.includes("admin")}
          />

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }} className="ml-auto">
            <div className="count-pill">
              {totalPrecatorios} registros
              {loading && initialized && <Loader2 className="w-3 h-3 animate-spin"/>}
            </div>
            <div className="view-tabs">
              <button 
                className={\`view-tab \${viewMode === 'cards' ? 'active' : ''}\`}
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Cards
              </button>
              <button 
                className={\`view-tab \${viewMode === 'table' ? 'active' : ''}\`}
                onClick={() => setViewMode('table')}
              >
                <List className="w-3.5 h-3.5" /> Tabela
              </button>
            </div>
          </div>
        </div>

        {/* Filtros ativos */}
        {temFiltrosAtivos && (
          <div className="filters-active">
            <span className="filters-label">Filtros ativos</span>
            {responsavelAtivo && (
              <div className="chip">
                <span className="chip-key">Responsável:</span> {responsavelAtivo} 
                <button className="chip-remove" onClick={() => handleRemoveFiltro("responsavel_id")}><X className="w-3 h-3" /></button>
              </div>
            )}
            {filtrosAtivos.map((filtro, index) => (
              <div className="chip" key={index}>
                <span className="chip-key">{filtro.label}:</span> {filtro.displayValue}
                <button className="chip-remove" onClick={() => handleRemoveFiltro(filtro.key)}><X className="w-3 h-3" /></button>
              </div>
            ))}
            <button className="btn-outline" style={{ height: "28px", padding: "0 10px", fontSize: "12px", borderRadius: "8px" }} onClick={handleClearAllFiltros}>
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* 3. META-ROW */}
      <div className="cards-meta" style={{ padding: '0 2px' }}>
        <span className="cards-meta-label">
          Exibindo <strong>{rangeStart}-{rangeEnd}</strong> de <strong>{totalPrecatorios}</strong> precatórios
        </span>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="selection-bar">
          <div className="selection-bar-left">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={selectedIds.size > 0 && selectedIds.size === deletableCount} 
                onCheckedChange={toggleSelectAll} 
                className="data-[state=checked]:bg-primary"
              />
              <span className="text-sm font-medium">Selecionar página</span>
            </label>
            <span className="selection-count">{selectedIds.size} selecionados</span>
          </div>
          <button className="btn btn-outline" style={{ height: "32px", padding: "0 12px", fontSize: "12.5px", color: "var(--rose)", borderColor: "rgba(244,63,94,.3)" }} onClick={() => setBatchDeleteDialogOpen(true)}>
            <Trash2 className="w-4 h-4" /> Excluir selecionados
          </button>
        </div>
      )}

      {/* Empty State ou Lista */}
      {precatorios.length === 0 ? (
        <div className="empty" style={{ background: "var(--surface)" }}>
          <div className="empty-icon">{searchTerm || temFiltrosAtivos ? <Filter className="h-10 w-10 text-muted-foreground opacity-50 mx-auto mb-3" /> : <FileText className="h-10 w-10 text-muted-foreground opacity-50 mx-auto mb-3" />}</div>
          <h3 className="empty-title">
            {searchTerm || temFiltrosAtivos ? "Nenhum resultado encontrado" : "Sua lista está vazia"}
          </h3>
          <p className="empty-desc">
            {searchTerm || temFiltrosAtivos
              ? "Tente ajustar os filtros ou termo de busca para encontrar o que procura."
              : "Comece adicionando novos precatórios para gerenciá-los aqui."}
          </p>
          {!searchTerm && !temFiltrosAtivos && (
            <button className="btn btn-primary mt-4" onClick={() => router.push("/precatorios/novo")}>
              <Plus className="w-4 h-4 mr-1" /> Cadastrar Precatório
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === "cards" ? (
            /* 4. CARDS GRID */
            <div className="cards-grid">
              {precatorios.map((precatorio, index) => {
                const valorAtualizado = Number(precatorio.valor_atualizado || 0);
                const valorPrincipal = Number(precatorio.valor_principal || 0);
                const valorExibido = valorAtualizado > 0 ? valorAtualizado : valorPrincipal;
                const valorLabel = valorAtualizado > 0 ? "Atualizado" : "Principal";
                
                let cardClass = "card-item";
                let tagStatusClass = "tag-status-novo";
                let statusLabel = STATUS_LABELS[precatorio.status || ""] || precatorio.status?.replace(/_/g, " ") || "Novo";
                
                if (precatorio.status === "em_calculo") {
                  cardClass += " card-neutro";
                  tagStatusClass = "tag-status-calculo";
                } else if (precatorio.status === "concluido" || precatorio.status?.includes("pago") || precatorio.status?.includes("finalizado")) {
                  cardClass += " card-ok";
                  tagStatusClass = "tag-status-concluido";
                } else if (precatorio.status === "em_andamento" || precatorio.status === "analise") {
                  cardClass += " card-atencao";
                  tagStatusClass = "tag-status-andamento";
                } else if (precatorio.urgente) {
                  cardClass += " card-urgente";
                } else if (precatorio.status === "cancelado") {
                  tagStatusClass = "tag-status-cancelado";
                }

                const initials = String(precatorio.credor_nome || precatorio.titulo || "P").substring(0, 2).toUpperCase();
                const responsavelNome = precatorio.responsavel_nome || precatorio.responsavel_calculo_nome || "Não atribuído";
                const respInitials = responsavelNome !== "Não atribuído" ? String(responsavelNome).substring(0, 2).toUpperCase() : "—";

                return (
                  <div key={precatorio.id} className={cardClass} onClick={() => router.push(\`/precatorios/detalhes?id=\${precatorio.id}\`)}>
                    <div className="card-tags">
                      {precatorio.urgente && <span className="tag tag-urgente"><span className="tag-dot"></span>Urgente</span>}
                      <span className={\`tag \${tagStatusClass}\`}><span className="tag-dot"></span>{statusLabel}</span>
                      {canDelete(precatorio) && (
                        <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(precatorio.id)} onCheckedChange={() => toggleSelection(precatorio.id)} />
                        </div>
                      )}
                    </div>
                    
                    <div className="card-head">
                      <div className="card-credor-block">
                        <div className="card-credor-row">
                          <div className="card-avatar" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{initials}</div>
                          <div>
                            <div className="card-credor">{precatorio.credor_nome || precatorio.titulo || \`Precatório \${precatorio.numero_precatorio}\`}</div>
                            <div className="card-num">{precatorio.numero_precatorio || "Sem número"}</div>
                          </div>
                        </div>
                        <div className="card-title-row">
                          <div className="card-devedor">Devedor: {precatorio.devedor || "Não informado"}</div>
                        </div>
                      </div>
                      <div className="card-valor-block">
                        <div className={\`card-valor \${valorAtualizado > 0 ? "valor-atualizado" : "valor-principal"}\`}>
                           {valorExibido > 0
                              ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valorExibido)
                              : "Aguardando"}
                        </div>
                        <div className="card-valor-label" style={{ color: valorAtualizado > 0 ? "var(--emerald)" : "var(--primary)" }}>{valorExibido > 0 ? valorLabel : "Valor"}</div>
                      </div>
                    </div>

                    <hr className="card-divider" />

                    <div className="card-info">
                      <div className="info-item">
                        <div className="info-label">Tribunal</div>
                        <div className="info-value">{precatorio.tribunal || "-"}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Processo</div>
                        <div className="info-value mono">{precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : "-"}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Data-base</div>
                        <div className="info-value">{precatorio.data_base ? new Date(precatorio.data_base).toLocaleDateString("pt-BR") : "-"}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Prioridade</div>
                        <div className="info-value">{precatorio.prioridade || "-"}</div>
                      </div>
                    </div>

                    <div className="card-footer">
                      <div className="card-resp">
                        <div className="resp-avatar" style={responsavelNome === "Não atribuído" ? { background: "var(--text-muted)" } : {}}>{respInitials}</div>
                        <span className="resp-name">{responsavelNome}</span>
                      </div>
                      <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        <span className="card-action-btn" onClick={() => router.push(\`/precatorios/detalhes?id=\${precatorio.id}\`)}>Ver detalhes →</span>
                        {canDelete(precatorio) && (
                          <HeroDropdown placement="bottom-end" disableAnimation>
                            <HeroDropdownTrigger>
                              <button className="card-action-btn" style={{ padding: '4px' }}>
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </HeroDropdownTrigger>
                            <HeroDropdownPopover className={deleteActionPopoverClassName}>
                              <HeroDropdownMenu aria-label="Acoes do precatorio" className={deleteActionMenuClassName}>
                                <HeroDropdownItem
                                  key="delete"
                                  className={deleteActionItemClassName}
                                  style={deleteActionItemStyle}
                                  textValue="Excluir item"
                                  onPress={() => {
                                    setPrecatorioToDelete(precatorio)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <div className={deleteActionContentClassName}>
                                    <div className="flex shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger w-8 h-8">
                                      <Trash2 className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-1 flex-col justify-center">
                                      <p className="text-sm font-semibold text-white">Excluir item</p>
                                    </div>
                                  </div>
                                </HeroDropdownItem>
                              </HeroDropdownMenu>
                            </HeroDropdownPopover>
                          </HeroDropdown>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* 5. TABLE VIEW */
            <div className="table-wrap">
              <div className="overflow-x-auto">
                <table className="precatorios-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Credor</th>
                      <th>Status</th>
                      <th>Tribunal</th>
                      <th>Processo</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th>Atualização</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {precatorios.map((precatorio) => {
                      const valorAtualizado = Number(precatorio.valor_atualizado || 0)
                      const valorPrincipal = Number(precatorio.valor_principal || 0)
                      const valorExibido = valorAtualizado > 0 ? valorAtualizado : valorPrincipal
                      const valorLabel = valorAtualizado > 0 ? "Atualizado" : "Principal"
                      const statusLabel = STATUS_LABELS[precatorio.status || ""] || precatorio.status?.replace(/_/g, " ") || "Novo"
                      
                      let tagStatusClass = "tag-status-novo"
                      if (precatorio.status === "em_calculo") tagStatusClass = "tag-status-calculo"
                      else if (precatorio.status === "concluido" || precatorio.status?.includes("pago") || precatorio.status?.includes("finalizado")) tagStatusClass = "tag-status-concluido"
                      else if (precatorio.status === "em_andamento" || precatorio.status === "analise") tagStatusClass = "tag-status-andamento"
                      else if (precatorio.status === "cancelado") tagStatusClass = "tag-status-cancelado"

                      return (
                        <tr key={precatorio.id} onClick={() => router.push(\`/precatorios/detalhes?id=\${precatorio.id}\`)} style={{ cursor: 'pointer' }}>
                          <td onClick={(e) => e.stopPropagation()}>
                            {canDelete(precatorio) && (
                              <Checkbox checked={selectedIds.has(precatorio.id)} onCheckedChange={() => toggleSelection(precatorio.id)} />
                            )}
                          </td>
                          <td className="td-credor">
                            {precatorio.credor_nome || precatorio.titulo}
                            {precatorio.numero_precatorio && <div className="td-num mt-1">{precatorio.numero_precatorio}</div>}
                          </td>
                          <td>
                            <span className={\`tag \${tagStatusClass}\`} style={{ fontSize: '10px' }}>{statusLabel}</span>
                            {precatorio.urgente && <span className="tag tag-urgente ml-1" style={{ fontSize: '10px' }}>Urgente</span>}
                          </td>
                          <td>{precatorio.tribunal || "-"}</td>
                          <td className="td-num">
                            {precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : "-"}
                          </td>
                          <td className="td-valor">
                             <div style={{ color: valorAtualizado > 0 ? "var(--emerald)" : "var(--primary)" }}>
                               {valorExibido > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorExibido) : "-"}
                             </div>
                             <div style={{ fontSize: '10px', color: "var(--text-muted)", marginTop: '2px', fontWeight: 600, textTransform: 'uppercase' }}>{valorExibido > 0 ? valorLabel : "Aguardando"}</div>
                          </td>
                          <td>
                            {new Date(precatorio.updated_at || precatorio.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="td-action" onClick={(e) => e.stopPropagation()}>
                            {canDelete(precatorio) && (
                              <HeroDropdown placement="bottom-end" disableAnimation>
                                <HeroDropdownTrigger>
                                  <button className="card-action-btn ml-auto w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg)] cursor-pointer">
                                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                                  </button>
                                </HeroDropdownTrigger>
                                <HeroDropdownPopover className={deleteActionPopoverClassName}>
                                  <HeroDropdownMenu aria-label="Acoes do precatorio" className={deleteActionMenuClassName}>
                                    <HeroDropdownItem
                                      key="delete"
                                      className={deleteActionItemClassName}
                                      style={deleteActionItemStyle}
                                      textValue="Excluir item"
                                      onPress={() => {
                                        setPrecatorioToDelete(precatorio)
                                        setDeleteDialogOpen(true)
                                      }}
                                    >
                                      <div className={deleteActionContentClassName}>
                                        <div className="flex shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger w-8 h-8">
                                          <Trash2 className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-1 flex-col justify-center">
                                          <p className="text-sm font-semibold text-white">Excluir item</p>
                                        </div>
                                      </div>
                                    </HeroDropdownItem>
                                  </HeroDropdownMenu>
                                </HeroDropdownPopover>
                              </HeroDropdown>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginação */}
          <div className="pagination">
            <span className="pagination-info">
              Exibindo {rangeStart}-{rangeEnd} de {totalPrecatorios}
            </span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                &larr;
              </button>
              <span className="mx-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Página {currentPage} / {totalPages}
              </span>
              <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                &rarr;
              </button>
            </div>
          </div>
        </>
      )}

      {/* DIALOGS */}
      <AlertDialog isOpen={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger">
                  <Trash2 className="w-5 h-5" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Excluir este item?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Tem certeza que deseja remover permanentemente o precatório <strong>{precatorioToDelete?.titulo || precatorioToDelete?.numero_precatorio}</strong>? Esta ação não pode ser desfeita.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <HeroButton slot="close" variant="tertiary" onPress={() => setDeleteDialogOpen(false)}>
                  Cancelar
                </HeroButton>
                <HeroButton slot="close" variant="danger" onPress={handleDeletePrecatorio} isLoading={deleting}>
                  Excluir item
                </HeroButton>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão em Lote</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} precatório{selectedIds.size !== 1 ? 's' : ''}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchDeleteDialogOpen(false)}
              disabled={deletingBatch}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={deletingBatch}
            >
              {deletingBatch ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                \`Excluir \${selectedIds.size} Precatório\${selectedIds.size !== 1 ? 's' : ''}\`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportJsonModal
        open={importJsonOpen}
        onOpenChange={setImportJsonOpen}
        onSuccess={() => {
          refetch()
          setImportJsonOpen(false)
        }}
      />
    </div>
  )
}
`;

const finalContent = beforeReturn + "\n" + newReturn;

fs.writeFileSync(filePath, finalContent, 'utf-8');
console.log("Page updated completely!");
