import * as React from 'react';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import {
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  listarAtributosConValores,
  crearAtributo,
  actualizarAtributo,
  eliminarAtributo,
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  listarVariantesPorProducto,
  crearVariante,
  actualizarVariante,
  eliminarVariante,
} from '@/services/catalogoService';
import type { Column } from '@/components/ui/Table';
import type {
  Categoria,
  AtributoConValores,
  ProductoListado,
  VarianteListado,
} from '@/services/catalogoService';
import type { CategoriaForm, AtributoForm, ProductoForm, VarianteForm } from '@/types/catalogo';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function formatUsd(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

// ------------------------------------------------------------------
// Categorías
// ------------------------------------------------------------------

function CategoriasTab() {
  const [items, setItems] = React.useState<Categoria[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [nombre, setNombre] = React.useState('');
  const [editando, setEditando] = React.useState<Categoria | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const data = await listarCategorias();
    setItems(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form: CategoriaForm = { nombre };
    if (editando) {
      await actualizarCategoria(editando.id, form);
    } else {
      await crearCategoria(form);
    }
    setNombre('');
    setEditando(null);
    await cargar();
  };

  const handleEdit = (item: Categoria) => {
    setEditando(item);
    setNombre(item.nombre);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await eliminarCategoria(id);
    await cargar();
  };

  const columns: Column<Categoria>[] = [
    { key: 'nombre', header: 'Nombre' },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(row)}>
            Editar
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label={editando ? 'Editar categoría' : 'Nueva categoría'}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la categoría"
          />
        </div>
        <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
        {editando && (
          <Button type="button" variant="ghost" onClick={() => { setEditando(null); setNombre(''); }}>
            Cancelar
          </Button>
        )}
      </form>
      <Table<Categoria>
        columns={columns}
        data={items}
        keyExtractor={(c) => c.id}
        isLoading={loading}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// Atributos
// ------------------------------------------------------------------

function AtributosTab() {
  const [items, setItems] = React.useState<AtributoConValores[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [nombre, setNombre] = React.useState('');
  const [valores, setValores] = React.useState<{ id?: string; valor: string }[]>([
    { valor: '' },
  ]);
  const [editando, setEditando] = React.useState<AtributoConValores | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const data = await listarAtributosConValores();
    setItems(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form: AtributoForm = {
      nombre,
      valores: valores.filter((v) => v.valor.trim() !== ''),
    };
    if (editando) {
      await actualizarAtributo(editando.id, form);
    } else {
      await crearAtributo(form);
    }
    setNombre('');
    setValores([{ valor: '' }]);
    setEditando(null);
    await cargar();
  };

  const handleEdit = (item: AtributoConValores) => {
    setEditando(item);
    setNombre(item.nombre);
    setValores(
      item.atributo_valores.length > 0
        ? item.atributo_valores.map((v) => ({ id: v.id, valor: v.valor }))
        : [{ valor: '' }]
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este atributo?')) return;
    await eliminarAtributo(id);
    await cargar();
  };

  const addValor = () => setValores([...valores, { valor: '' }]);
  const removeValor = (index: number) =>
    setValores(valores.filter((_, i) => i !== index));
  const updateValor = (index: number, valor: string) => {
    const next = [...valores];
    next[index] = { ...next[index], valor };
    setValores(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <Input
          label="Nombre del atributo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Sabor, Talle, Color"
        />
        <div>
          <label className="mb-2 block text-sm font-medium text-textMuted">Valores</label>
          <div className="flex flex-col gap-2">
            {valores.map((v, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={v.valor}
                  onChange={(e) => updateValor(i, e.target.value)}
                  placeholder={`Valor ${i + 1}`}
                />
                <Button type="button" variant="ghost" onClick={() => removeValor(i)}>
                  ✕
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={addValor}>
            + Agregar valor
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
          {editando && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditando(null);
                setNombre('');
                setValores([{ valor: '' }]);
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="grid grid-cols-1 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
          >
            <div>
              <p className="font-medium text-textPrimary">{item.nombre}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.atributo_valores.map((v) => (
                  <Badge key={v.id} variant="outline">
                    {v.valor}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>
                Editar
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>
      {loading && (
        <div className="flex justify-center py-8">
          <Loader size="md" color="violet" />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Productos
// ------------------------------------------------------------------

function ProductosTab() {
  const [productos, setProductos] = React.useState<ProductoListado[]>([]);
  const [categorias, setCategorias] = React.useState<Categoria[]>([]);
  const [atributos, setAtributos] = React.useState<AtributoConValores[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [nombre, setNombre] = React.useState('');
  const [categoriaId, setCategoriaId] = React.useState('');
  const [atributoIds, setAtributoIds] = React.useState<string[]>([]);
  const [editando, setEditando] = React.useState<ProductoListado | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const [p, c, a] = await Promise.all([
      listarProductos(),
      listarCategorias(),
      listarAtributosConValores(),
    ]);
    setProductos(p);
    setCategorias(c);
    setAtributos(a);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form: ProductoForm = {
      nombre,
      categoria_id: categoriaId || null,
      atributo_ids: atributoIds,
    };
    if (editando) {
      await actualizarProducto(editando.id, form);
    } else {
      await crearProducto(form);
    }
    resetForm();
    await cargar();
  };

  const resetForm = () => {
    setNombre('');
    setCategoriaId('');
    setAtributoIds([]);
    setEditando(null);
  };

  const handleEdit = (item: ProductoListado) => {
    setEditando(item);
    setNombre(item.nombre);
    setCategoriaId(item.categoria_id ?? '');
    setAtributoIds(item.producto_atributos.map((pa) => pa.atributo_id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await eliminarProducto(id);
    await cargar();
  };

  const toggleAtributo = (id: string) => {
    setAtributoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const columns: Column<ProductoListado>[] = [
    { key: 'nombre', header: 'Nombre' },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (p) => p.categorias?.nombre ?? '—',
    },
    {
      key: 'atributos',
      header: 'Atributos',
      render: (p) =>
        p.producto_atributos.map((pa) => pa.atributos.nombre).join(', ') || '—',
    },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(row)}>
            Editar
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
      >
        <Input
          label="Nombre del producto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Elfbar BC5000"
        />
        <Select
          label="Categoría"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          placeholder="Sin categoría"
          options={[{ value: '', label: 'Sin categoría' }, ...categorias.map((c) => ({ value: c.id, label: c.nombre }))]}
        />
        <div>
          <label className="mb-2 block text-sm font-medium text-textMuted">Atributos</label>
          <div className="flex flex-wrap gap-2">
            {atributos.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAtributo(a.id)}
                className={[
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  atributoIds.includes(a.id)
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-[#0B0B0C] text-textMuted hover:text-textPrimary',
                ].join(' ')}
              >
                {a.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
          {editando && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <Table<ProductoListado>
        columns={columns}
        data={productos}
        keyExtractor={(p) => p.id}
        isLoading={loading}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// Variantes
// ------------------------------------------------------------------

function VariantesTab() {
  const [productos, setProductos] = React.useState<ProductoListado[]>([]);
  const [variantes, setVariantes] = React.useState<VarianteListado[]>([]);
  const [atributos, setAtributos] = React.useState<AtributoConValores[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [productoId, setProductoId] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [costoUsd, setCostoUsd] = React.useState('');
  const [stockCentral, setStockCentral] = React.useState('0');
  const [atributoValorIds, setAtributoValorIds] = React.useState<string[]>([]);
  const [editando, setEditando] = React.useState<VarianteListado | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const cargarProductos = React.useCallback(async () => {
    const data = await listarProductos();
    setProductos(data);
  }, []);

  const cargarAtributos = React.useCallback(async () => {
    const data = await listarAtributosConValores();
    setAtributos(data);
  }, []);

  React.useEffect(() => {
    cargarProductos();
    cargarAtributos();
  }, [cargarProductos, cargarAtributos]);

  const productoSeleccionado = productos.find((p) => p.id === productoId);
  const atributosDelProducto = atributos.filter((a) =>
    productoSeleccionado?.producto_atributos.some((pa) => pa.atributo_id === a.id)
  );

  const cargarVariantes = React.useCallback(async () => {
    if (!productoId) {
      setVariantes([]);
      return;
    }
    setLoading(true);
    const data = await listarVariantesPorProducto(productoId);
    setVariantes(data);
    setLoading(false);
  }, [productoId]);

  React.useEffect(() => {
    cargarVariantes();
  }, [cargarVariantes]);

  const resetForm = () => {
    setSku('');
    setCostoUsd('');
    setStockCentral('0');
    setAtributoValorIds([]);
    setEditando(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const costo = Number(costoUsd.replace(',', '.'));
    const stock = Number(stockCentral);
    if (editando) {
      await actualizarVariante(editando.id, {
        sku: sku || null,
        costo_usd: costo,
        stock_central: stock,
        atributo_valor_ids: atributoValorIds,
      });
    } else {
      const form: VarianteForm = {
        producto_id: productoId,
        sku: sku || null,
        costo_usd: costo,
        stock_central: stock,
        atributo_valor_ids: atributoValorIds,
      };
      await crearVariante(form);
    }
    resetForm();
    setModalOpen(false);
    await cargarVariantes();
  };

  const handleEdit = (v: VarianteListado) => {
    setEditando(v);
    setSku(v.sku ?? '');
    setCostoUsd(String(v.costo_usd));
    setStockCentral(String(v.stock_central));
    setAtributoValorIds(v.variante_atributos.map((va) => va.atributo_valor_id));
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta variante?')) return;
    await eliminarVariante(id);
    await cargarVariantes();
  };

  const toggleValor = (id: string) => {
    setAtributoValorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const columns: Column<VarianteListado>[] = [
    {
      key: 'sku',
      header: 'SKU',
      mono: true,
      render: (v) => v.sku ?? '—',
    },
    {
      key: 'atributos',
      header: 'Atributos',
      render: (v) =>
        v.variante_atributos.map((va) => va.atributo_valores.valor).join(' / ') || '—',
    },
    {
      key: 'costo',
      header: 'Costo USD',
      align: 'right',
      mono: true,
      render: (v) => formatUsd(v.costo_usd),
    },
    {
      key: 'stock',
      header: 'Stock central',
      align: 'right',
      render: (v) => v.stock_central,
    },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(row)}>
            Editar
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)}>
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select
            label="Producto"
            value={productoId}
            onChange={(e) => {
              setProductoId(e.target.value);
              resetForm();
            }}
            placeholder="Seleccionar producto"
            options={productos.map((p) => ({ value: p.id, label: p.nombre }))}
          />
        </div>
        <Button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          disabled={!productoId}
        >
          + Nueva variante
        </Button>
      </div>

      <Table<VarianteListado>
        columns={columns}
        data={variantes}
        keyExtractor={(v) => v.id}
        isLoading={loading}
        emptyMessage="Seleccioná un producto para ver sus variantes."
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar variante' : 'Nueva variante'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="SKU (opcional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Ej: ELF-GRAPE-001"
          />
          <Input
            label="Costo USD"
            type="number"
            step="0.01"
            min="0"
            value={costoUsd}
            onChange={(e) => setCostoUsd(e.target.value)}
            required
          />
          <Input
            label="Stock central"
            type="number"
            min="0"
            step="1"
            value={stockCentral}
            onChange={(e) => setStockCentral(e.target.value)}
            required
          />
          {atributosDelProducto.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-textMuted">
                Valores de atributos
              </label>
              <div className="flex flex-col gap-3">
                {atributosDelProducto.map((a) => (
                  <div key={a.id}>
                    <p className="mb-1 text-xs font-medium text-textMuted">{a.nombre}</p>
                    <div className="flex flex-wrap gap-2">
                      {a.atributo_valores.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => toggleValor(av.id)}
                          className={[
                            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            atributoValorIds.includes(av.id)
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-border bg-[#0B0B0C] text-textMuted hover:text-textPrimary',
                          ].join(' ')}
                        >
                          {av.valor}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editando ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------
// Página
// ------------------------------------------------------------------

export function CatalogoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Catálogo</h1>
        <p className="text-sm text-textMuted">Categorías, atributos, productos y variantes</p>
      </div>

      <Tabs
        tabs={[
          { id: 'categorias', label: 'Categorías', content: <CategoriasTab /> },
          { id: 'atributos', label: 'Atributos', content: <AtributosTab /> },
          { id: 'productos', label: 'Productos', content: <ProductosTab /> },
          { id: 'variantes', label: 'Variantes', content: <VariantesTab /> },
        ]}
      />
    </div>
  );
}
