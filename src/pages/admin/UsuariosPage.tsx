import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { listarPerfiles, crearReventa } from '@/services/usuariosService';
import type { Column } from '@/components/ui/Table';
import type { PerfilRow } from '@/types';

export function UsuariosPage() {
  const [reventas, setReventas] = React.useState<PerfilRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [nombre, setNombre] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [telefono, setTelefono] = React.useState('');
  const [direccion, setDireccion] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarPerfiles();
      setReventas(data.filter((p) => p.rol === 'reventa'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await crearReventa({
        email,
        password,
        nombre,
        telefono: telefono || null,
        direccion: direccion || null,
      });
      setModalOpen(false);
      setNombre('');
      setEmail('');
      setPassword('');
      setTelefono('');
      setDireccion('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la reventa.');
    }
  };

  const columns: Column<PerfilRow>[] = [
    { key: 'nombre', header: 'Nombre' },
    { key: 'email', header: 'Email' },
    {
      key: 'telefono',
      header: 'Teléfono',
      render: (p) => p.telefono ?? '—',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (p) => (
        <Badge variant={p.activo ? 'success' : 'danger'}>
          {p.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400">
          {error}
        </p>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Usuarios</h1>
          <p className="text-sm text-textMuted">Alta de reventas</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nueva reventa</Button>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader size="lg" color="violet" />
        </div>
      ) : (
        <Table<PerfilRow> columns={columns} data={reventas} keyExtractor={(p) => p.id} />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva reventa"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la reventa"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
          />
          <Input
            label="Teléfono (opcional)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
          <Input
            label="Dirección (opcional)"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear reventa</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
