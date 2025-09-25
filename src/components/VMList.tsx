import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Menu,
  MenuItem,
  DialogContentText,
  TextField,
  Dialog as MuiDialog
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Delete,
  Settings,
  MoreVert,
  ContentCopy,
  
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { getAllVMs, getPowerState, changePowerState, deleteVM, getVMIP, cloneVM, registerVM, getVM, getVMNicIps } from '../api/client';
import type { VMPowerState as OrigVMPowerState, VM } from '../types/api';
import { VMSettings } from './VMSettings';
import VMNetworksDialog from './VMNetworksDialog';
import { MainHeader } from './MainHeader';
import axios from 'axios';

type VMPowerState = OrigVMPowerState | { power_state: 'poweringOn' | 'poweringOff' };

const getVMName = (path: string) => {
  if (!path) return '';
  const parts = path.split(/\//);
  return parts[parts.length - 1] || path;
};

const stateInfo = {
  poweredOn: { label: 'On', color: 'success' },
  poweredOff: { label: 'Off', color: 'default' },
  paused: { label: 'Paused', color: 'warning' },
  suspended: { label: 'Suspended', color: 'info' },
  poweringOn: { label: 'Powering On', color: 'info' },
  poweringOff: { label: 'Powering Off', color: 'info' }
};

export const VMList = () => {
  const [selectedVM, setSelectedVM] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'|'info'}>({open: false, message: '', severity: 'success'});
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuVM, setMenuVM] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [dialogVMId, setDialogVMId] = useState<string | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneParentId, setCloneParentId] = useState<string | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerPath, setRegisterPath] = useState('');
  const [networksDialogOpen, setNetworksDialogOpen] = useState(false);
  const [localPowering, setLocalPowering] = useState<Record<string, 'poweringOn' | 'poweringOff' | null>>({});
  const poweringTimeouts = useRef<Record<string, number>>({});

  const { data: vms, isLoading, isError, error } = useQuery({
    queryKey: ['vms'],
    queryFn: () => getAllVMs().then(res => res.data),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Получаем состояния всех VM параллельно
  const { data: powerStates } = useQuery({
    queryKey: ['vms-power', vms?.map(vm => vm.id)],
    queryFn: async () => {
      if (!vms) return {};
      const results: Record<string, VMPowerState> = {};
      await Promise.all(
        vms.map(async (vm: VM) => {
          try {
            const res = await getPowerState(vm.id);
            results[vm.id] = res.data;
          } catch {
            results[vm.id] = { power_state: 'poweredOff' };
          }
        })
      );
      return results;
    },
    enabled: !!vms && vms.length > 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Получаем IP-адреса всех VM параллельно
  const ipQueries = useQueries({
    queries: (vms || []).map(vm => ({
      queryKey: ['vm-ip', vm.id],
      queryFn: async () => {
        try {
          const res = await getVMIP(vm.id);
          if (res.data && res.data.ip) return { ip: res.data.ip };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const code = error.response?.data?.Code || error.response?.data?.code;
            const message = error.response?.data?.Message || error.response?.data?.message;
            if (code === 106) return { error: 'VM Off', tooltip: message };
            if (code === 118) return { error: 'No IP', tooltip: message };
            if (error.response?.status === 409) return { error: null };
            return { error: '—', tooltip: message };
          }
        }
        // Если основной IP не найден, пробуем получить через nicips
        try {
          const nicips = await getVMNicIps(vm.id);
          const extractIp = (ip: string) => ip.split('/')[0];
          if (nicips.data && nicips.data.nics) {
            const nics = nicips.data.nics;
            if (Array.isArray(nics)) {
              for (const nic of nics) {
                if (nic.ip && nic.ip.length > 0) return { ip: extractIp(nic.ip[0]) };
                if (nic.ipAddress && nic.ipAddress.length > 0) return { ip: extractIp(nic.ipAddress[0]) };
              }
            } else if (nics.ip && nics.ip.length > 0) {
              return { ip: extractIp(nics.ip[0]) };
            } else if (nics.ipAddress && nics.ipAddress.length > 0) {
              return { ip: extractIp(nics.ipAddress[0]) };
            }
          }
        } catch {}
        return { error: null };
      },
      enabled: !!vms,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }))
  });

  // Получаем подробную информацию о всех VM параллельно
  const vmInfoQueries = useQueries({
    queries: (vms || []).map(vm => ({
      queryKey: ['vm-info', vm.id],
      queryFn: () => getVM(vm.id).then(res => res.data),
      enabled: !!vms
    }))
  });

  const powerMutation = useMutation({
    mutationFn: ({ id, operation }: { id: string; operation: 'on'|'off'|'shutdown'|'suspend'|'pause'|'unpause' }) =>
      changePowerState(id, operation),
    onMutate: async ({ id, operation }) => {
      await queryClient.cancelQueries({ queryKey: ['vms-power'] });
      const previous = queryClient.getQueryData<Record<string, VMPowerState> | undefined>(['vms-power']);
      // Локально выставляем промежуточный статус
      setLocalPowering(prev => ({ ...prev, [id]: operation === 'on' ? 'poweringOn' : operation === 'off' ? 'poweringOff' : null }));
      // На всякий случай сбрасываем через 10 секунд, если API не ответил
      if (poweringTimeouts.current[id]) clearTimeout(poweringTimeouts.current[id]);
      poweringTimeouts.current[id] = setTimeout(() => {
        setLocalPowering(prev => ({ ...prev, [id]: null }));
      }, 10000);
      queryClient.setQueryData(['vms-power'], (old: Record<string, VMPowerState> | undefined) => ({
        ...old,
        [id]: { power_state: operation === 'on' ? 'poweringOn' : operation === 'off' ? 'poweringOff' : old?.[id]?.power_state }
      }));
      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['vms-power'], context.previous);
      }
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setSnackbar({open: true, message: 'Operation not allowed in current VM state', severity: 'info'});
      } else {
        setSnackbar({open: true, message: 'Failed to change power state', severity: 'error'});
      }
      queryClient.invalidateQueries({ queryKey: ['vms-power'] });
    },
    onSuccess: () => {
      setSnackbar({open: true, message: 'Power state changed', severity: 'success'});
      queryClient.invalidateQueries({ queryKey: ['vms-power'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vms-power'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVM(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
      setDeleteDialogOpen(false);
      setSnackbar({open: true, message: 'VM deleted', severity: 'success'});
    },
    onError: () => {
      setSnackbar({open: true, message: 'Failed to delete VM', severity: 'error'});
    }
  });

  const cloneMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string }) => cloneVM(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
      setCloneDialogOpen(false);
      setSnackbar({ open: true, message: 'VM cloned', severity: 'success' });
      setCloneName('');
      setCloneParentId(null);
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Error cloning VM', severity: 'error' });
    }
  });

  const registerMutation = useMutation({
    mutationFn: ({ name, path }: { name: string; path: string }) => registerVM(name, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vms'] });
      setRegisterDialogOpen(false);
      setSnackbar({ open: true, message: 'VM registered', severity: 'success' });
      setRegisterName('');
      setRegisterPath('');
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Error registering VM', severity: 'error' });
    }
  });

  const handlePowerAction = (id: string, operation: 'on'|'off'|'shutdown'|'suspend'|'pause'|'unpause') => {
    powerMutation.mutate({ id, operation });
  };

  const handleDelete = (id: string) => {
    setSelectedVM(id);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
    setMenuVM(null);
  };

  const handleSettings = (id: string) => {
    setDialogVMId(id);
    setMenuAnchor(null);
    setMenuVM(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setMenuAnchor(event.currentTarget);
    setMenuVM(id);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuVM(null);
  };

  const confirmDelete = () => {
    if (selectedVM) {
      deleteMutation.mutate(selectedVM);
    }
  };

  const handleClone = (id: string) => {
    setCloneParentId(id);
    setCloneDialogOpen(true);
    setMenuAnchor(null);
    setMenuVM(null);
  };

  const confirmClone = () => {
    if (cloneParentId && cloneName) {
      cloneMutation.mutate({ name: cloneName, parentId: cloneParentId });
    }
  };

  const confirmRegister = () => {
    if (registerName && registerPath) {
      registerMutation.mutate({ name: registerName, path: registerPath });
    }
  };

  useEffect(() => {
    if (!powerStates) return;
    setLocalPowering(prev => {
      const updated = { ...prev };
      Object.keys(powerStates).forEach(id => {
        if (updated[id] && powerStates[id]?.power_state !== 'poweringOn' && powerStates[id]?.power_state !== 'poweringOff') {
          updated[id] = null;
        }
      });
      return updated;
    });
  }, [powerStates]);

  return (
    <>
      <MainHeader
        onNetworks={() => setNetworksDialogOpen(true)}
        onRegister={() => setRegisterDialogOpen(true)}
        onLogout={() => {
          localStorage.removeItem('vmrest-auth');
          window.location.reload();
        }}
      />
      <Box sx={{ width: 1200, mx: 'auto', mt: 2 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress size={48} />
          </Box>
        )}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {typeof error === 'object' && error && 'message' in error
              ? (error as { message?: string }).message
              : 'Failed to load VMs'}
          </Alert>
        )}
        {!isLoading && !isError && (
          <TableContainer
            component={Paper}
            sx={{
              width: 1200,
              mx: 'auto',
              borderRadius: 4,
              boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
              bgcolor: '#23272e',
              mt: 4,
              overflow: 'hidden'
            }}
          >
            <Table
              size="small"
              sx={{
                fontSize: 15,
                width: '100%',
                tableLayout: 'fixed',
                '& th': { fontWeight: 700, fontSize: 16, bgcolor: 'rgba(255,255,255,0.04)', color: '#fff', border: 0 },
                '& td, & th': { borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#e0e0e0' },
                '& tr:hover': { bgcolor: 'rgba(255,255,255,0.06)', transition: 'background 0.2s' }
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell align="left" sx={{ width: 340 }}>Name / ID</TableCell>
                  <TableCell align="center" sx={{ width: 100 }}>CPU</TableCell>
                  <TableCell align="center" sx={{ width: 120 }}>Memory</TableCell>
                  <TableCell align="center" sx={{ width: 220 }}>IP</TableCell>
                  <TableCell align="center" sx={{ width: 120 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vms?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body1" color="text.secondary">No VMs found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {vms?.map((vm, idx) => {
                  const apiState = powerStates?.[vm.id]?.power_state || 'poweredOff';
                  const localState = localPowering[vm.id];
                  const state = localState || apiState;
                  const ip = ipQueries[idx]?.data;
                  const vmInfo = vmInfoQueries[idx]?.data;
                  return (
                    <TableRow key={vm.id} hover sx={{ fontSize: 15, height: 48 }}>
                      <TableCell align="left" sx={{ fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => handleSettings(vm.id)}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{getVMName(vm.path)}</span>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{vm.id}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {typeof vmInfo?.cpu === 'object' && vmInfo?.cpu?.processors !== undefined
                            ? vmInfo.cpu.processors
                            : typeof vmInfo?.cpu === 'number'
                              ? vmInfo.cpu
                              : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {typeof vmInfo?.memory === 'object' && vmInfo?.memory?.size !== undefined
                            ? vmInfo.memory.size
                            : typeof vmInfo?.memory === 'number'
                              ? vmInfo.memory
                              : '—'}
                          {((typeof vmInfo?.memory === 'object' && vmInfo?.memory?.size) || typeof vmInfo?.memory === 'number') ? ' MB' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {ip?.ip ? (
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{ip.ip}</Typography>
                        ) : ip?.error ? (
                          <Tooltip title={ip.tooltip || ''}>
                            <Typography variant="body2" color="text.secondary">{ip.error}</Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          {state === 'poweringOn' || state === 'poweringOff' ? (
                            <Tooltip title={stateInfo[state as keyof typeof stateInfo]?.label || ''}>
                              <span>
                                <IconButton size="small" disabled>
                                  <CircularProgress size={22} thickness={5} color="info" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : state === 'poweredOn' ? (
                            <Tooltip title="Power Off">
                              <span>
                                <IconButton color="error" size="small" onClick={() => handlePowerAction(vm.id, 'off')}>
                                  <Stop fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Power On">
                              <span>
                                <IconButton color="success" size="small" onClick={() => handlePowerAction(vm.id, 'on')}>
                                  <PlayArrow fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <IconButton size="small" onClick={e => handleMenuOpen(e, vm.id)}>
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                        <Menu
                          anchorEl={menuAnchor}
                          open={Boolean(menuAnchor) && menuVM === vm.id}
                          onClose={handleMenuClose}
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                          <MenuItem onClick={() => handleSettings(vm.id)}>
                            <Settings fontSize="small" sx={{ mr: 1 }} /> Settings
                          </MenuItem>
                          <MenuItem onClick={() => handleClone(vm.id)}>
                            <ContentCopy fontSize="small" sx={{ mr: 1 }} /> Clone
                          </MenuItem>
                          <MenuItem onClick={() => handleDelete(vm.id)} sx={{ color: 'error.main' }}>
                            <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Virtual Machine</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this virtual machine? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
        <Dialog open={!!dialogVMId} onClose={() => setDialogVMId(null)} maxWidth="md" fullWidth>
          <DialogTitle>VM Settings</DialogTitle>
          <DialogContent dividers>
            {dialogVMId && <VMSettings vmId={dialogVMId} />}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogVMId(null)}>Close</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={cloneDialogOpen} onClose={() => setCloneDialogOpen(false)}>
          <DialogTitle>Clone Virtual Machine</DialogTitle>
          <DialogContent>
            <DialogContentText>Enter a name for the new virtual machine:</DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="New VM Name"
              fullWidth
              value={cloneName}
              onChange={e => setCloneName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCloneDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmClone} disabled={!cloneName || cloneMutation.isPending} variant="contained">
              Clone
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={registerDialogOpen} onClose={() => setRegisterDialogOpen(false)}>
          <DialogTitle>Register Virtual Machine</DialogTitle>
          <DialogContent>
            <DialogContentText>Enter a name and path to an existing VM:</DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="VM Name"
              fullWidth
              value={registerName}
              onChange={e => setRegisterName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="VM Path (e.g. /Users/youruser/VMs/Win10/Win10.vmx)"
              fullWidth
              value={registerPath}
              onChange={e => setRegisterPath(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRegisterDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmRegister} disabled={!registerName || !registerPath || registerMutation.isPending} variant="contained">
              Register
            </Button>
          </DialogActions>
        </Dialog>
        <MuiDialog open={networksDialogOpen} onClose={() => setNetworksDialogOpen(false)} maxWidth="md" fullWidth>
          <VMNetworksDialog onClose={() => setNetworksDialogOpen(false)} />
        </MuiDialog>
      </Box>
    </>
  );
}; 