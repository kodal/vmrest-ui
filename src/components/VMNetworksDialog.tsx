import { useState } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllNetworks, createNetwork, getPortforwards, deletePortforward, addPortforward } from '../api/client';
import type { Network } from '../types/api';

export function VMNetworksDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('nat');
  const [selectedNet, setSelectedNet] = useState<string | null>(null);
  const [addPortDialog, setAddPortDialog] = useState(false);
  const [pfProtocol, setPfProtocol] = useState('tcp');
  const [pfPort, setPfPort] = useState('');
  const [pfGuestIp, setPfGuestIp] = useState('');
  const [pfGuestPort, setPfGuestPort] = useState('');
  const [pfDesc, setPfDesc] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['networks'],
    queryFn: () => getAllNetworks().then(res => res.data),
    refetchInterval: 5000
  });

  const createMutation = useMutation({
    mutationFn: () => createNetwork({ name: newName, type: newType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networks'] });
      setAddDialog(false);
      setNewName('');
      setNewType('nat');
    }
  });

  const { data: portforwards } = useQuery({
    queryKey: ['portforwards', selectedNet],
    queryFn: () => selectedNet ? getPortforwards(selectedNet).then(res => res.data) : Promise.resolve(null),
    enabled: !!selectedNet
  });

  const deletePortMutation = useMutation({
    mutationFn: ({ protocol, port }: { protocol: string; port: number }) =>
      selectedNet ? deletePortforward(selectedNet, protocol, port) : Promise.resolve(undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portforwards', selectedNet] });
    }
  });

  const addPortMutation = useMutation({
    mutationFn: () => selectedNet && pfPort && pfGuestIp && pfGuestPort ?
      addPortforward(selectedNet, pfProtocol, Number(pfPort), { guestIp: pfGuestIp, guestPort: Number(pfGuestPort), desc: pfDesc }) : Promise.resolve(undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portforwards', selectedNet] });
      setAddPortDialog(false);
      setPfProtocol('tcp');
      setPfPort('');
      setPfGuestIp('');
      setPfGuestPort('');
      setPfDesc('');
    }
  });

  return (
    <>
      <DialogTitle>Virtual Networks</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Networks</Typography>
          <Button startIcon={<Add />} onClick={() => setAddDialog(true)} size="small">Add</Button>
        </Box>
        {isLoading ? <CircularProgress /> : (
          <List>
            {data?.vmnets?.map((net: Network) => (
              <ListItem key={net.name} onClick={() => setSelectedNet(net.name)} sx={{ cursor: 'pointer', bgcolor: selectedNet === net.name ? 'action.selected' : undefined }}>
                <ListItemText
                  primary={`${net.name} (${net.type})`}
                  secondary={`DHCP: ${net.dhcp}, Subnet: ${net.subnet}, Mask: ${net.mask}`}
                />
              </ListItem>
            ))}
          </List>
        )}
        {selectedNet && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1">Port Forwarding ({selectedNet})</Typography>
            <Button startIcon={<Add />} onClick={() => setAddPortDialog(true)} size="small" sx={{ mb: 1 }}>Add Port Forward</Button>
            {Array.isArray(portforwards?.port_forwardings) && portforwards.port_forwardings.length ? (
              <List>
                {portforwards.port_forwardings.map((pf: { protocol: string; port: number; guest: { ip: string; port: number }; desc?: string }) => (
                  <ListItem key={pf.port + pf.protocol}>
                    <ListItemText
                      primary={`${pf.protocol.toUpperCase()} ${pf.port} → ${pf.guest.ip}:${pf.guest.port}`}
                      secondary={pf.desc}
                    />
                    <IconButton edge="end" onClick={() => deletePortMutation.mutate({ protocol: pf.protocol, port: pf.port })}>
                      <Delete />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No port forwards.</Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      {/* Add network dialog */}
      <DialogTitle sx={{ display: addDialog ? 'block' : 'none' }}>Add Network</DialogTitle>
      <DialogContent sx={{ display: addDialog ? 'block' : 'none' }}>
        <TextField
          label="Network Name"
          fullWidth
          sx={{ mb: 2 }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <FormControl fullWidth>
          <InputLabel>Type</InputLabel>
          <Select value={newType} label="Type" onChange={e => setNewType(e.target.value)}>
            <MenuItem value="nat">NAT</MenuItem>
            <MenuItem value="hostOnly">Host Only</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ display: addDialog ? 'flex' : 'none' }}>
        <Button onClick={() => setAddDialog(false)}>Cancel</Button>
        <Button onClick={() => createMutation.mutate()} disabled={!newName} variant="contained">Add</Button>
      </DialogActions>
      {/* Add port forward dialog */}
      <DialogTitle sx={{ display: addPortDialog ? 'block' : 'none' }}>Add Port Forward</DialogTitle>
      <DialogContent sx={{ display: addPortDialog ? 'block' : 'none' }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Protocol</InputLabel>
          <Select value={pfProtocol} label="Protocol" onChange={e => setPfProtocol(e.target.value)}>
            <MenuItem value="tcp">TCP</MenuItem>
            <MenuItem value="udp">UDP</MenuItem>
          </Select>
        </FormControl>
        <TextField label="External Port" fullWidth sx={{ mb: 2 }} value={pfPort} onChange={e => setPfPort(e.target.value.replace(/\D/g, ''))} />
        <TextField label="Guest IP" fullWidth sx={{ mb: 2 }} value={pfGuestIp} onChange={e => setPfGuestIp(e.target.value)} />
        <TextField label="Guest Port" fullWidth sx={{ mb: 2 }} value={pfGuestPort} onChange={e => setPfGuestPort(e.target.value.replace(/\D/g, ''))} />
        <TextField label="Description" fullWidth sx={{ mb: 2 }} value={pfDesc} onChange={e => setPfDesc(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ display: addPortDialog ? 'flex' : 'none' }}>
        <Button onClick={() => setAddPortDialog(false)}>Cancel</Button>
        <Button onClick={() => addPortMutation.mutate()} disabled={!pfPort || !pfGuestIp || !pfGuestPort} variant="contained">Add</Button>
      </DialogActions>
    </>
  );
}

export default VMNetworksDialog; 