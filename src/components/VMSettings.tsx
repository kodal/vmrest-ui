import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ButtonBase
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVM, updateVM, getNICs, deleteNIC, getSharedFolders, deleteSharedFolder, getVMRestrictions, getVMNicIps, updateNIC, updateSharedFolder } from '../api/client';
import type { NICDevice, SharedFolder, VmNicInfo } from '../types/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vm-tabpanel-${index}`}
      aria-labelledby={`vm-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface VMSettingsProps {
  vmId: string;
}

export const VMSettings = ({ vmId }: VMSettingsProps) => {
  const [tabValue, setTabValue] = useState(0);
  const queryClient = useQueryClient();

  const { data: vmInfo } = useQuery({
    queryKey: ['vm', vmId],
    queryFn: () => getVM(vmId).then(res => res.data)
  });

  const { data: nics } = useQuery({
    queryKey: ['nics', vmId],
    queryFn: () => getNICs(vmId).then(res => res.data)
  });

  const { data: sharedFolders } = useQuery({
    queryKey: ['sharedFolders', vmId],
    queryFn: () => getSharedFolders(vmId).then(res => res.data)
  });

  const { data: restrictions } = useQuery({
    queryKey: ['restrictions', vmId],
    queryFn: () => getVMRestrictions(vmId).then(res => res.data)
  });

  const { data: nicIps } = useQuery({
    queryKey: ['nicips', vmId],
    queryFn: () => getVMNicIps(vmId).then(res => res.data)
  });

  const updateVMMutation = useMutation({
    mutationFn: (data: Partial<import('../types/api').VMInformation>) => updateVM(vmId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vm', vmId] });
    }
  });

  const deleteNICMutation = useMutation({
    mutationFn: (index: number) => deleteNIC(vmId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nics', vmId] });
    }
  });

  const deleteSharedFolderMutation = useMutation({
    mutationFn: (folderId: string) => deleteSharedFolder(vmId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedFolders', vmId] });
    }
  });

  const [editNIC, setEditNIC] = useState<NICDevice | null>(null);
  const [editNICType, setEditNICType] = useState<NICDevice['type']>('nat');
  const [editNICVmnet, setEditNICVmnet] = useState('');
  const editNICMutation = useMutation({
    mutationFn: (data: { index: number; type: NICDevice['type']; vmnet: string }) => updateNIC(vmId, data.index, { type: data.type, vmnet: data.vmnet }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nics', vmId] });
      setEditNIC(null);
    }
  });

  const [editFolder, setEditFolder] = useState<SharedFolder | null>(null);
  const [editFolderId, setEditFolderId] = useState('');
  const [editFolderPath, setEditFolderPath] = useState('');
  const editFolderMutation = useMutation({
    mutationFn: (data: { folderId: string; host_path: string }) => updateSharedFolder(vmId, data.folderId, { host_path: data.host_path }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedFolders', vmId] });
      setEditFolder(null);
    }
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="General" />
          <Tab label="Network" />
          <Tab label="IP Addresses" />
          <Tab label="Shared Folders" />
          <Tab label="Restrictions" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="h6">VM Information</Typography>
            <Paper sx={{ p: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <TextField
                    fullWidth
                    label="VM ID"
                    value={vmInfo?.id || ''}
                    disabled
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="CPU Cores"
                      type="number"
                      value={vmInfo?.cpu?.processors || 1}
                      onChange={(e) => updateVMMutation.mutate({
                        cpu: { processors: parseInt(e.target.value) }
                      })}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Memory (MB)"
                      type="number"
                      value={vmInfo?.memory?.size || 512}
                      onChange={(e) => updateVMMutation.mutate({
                        memory: { size: parseInt(e.target.value) }
                      })}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Network Adapters</Typography>
          <Button
            startIcon={<Add />}
          >
            Add Network Adapter
          </Button>
        </Box>

        <List>
          {nics?.nics.map((nic) => (
            <ListItem key={nic.index}>
              <ButtonBase sx={{ width: '100%', textAlign: 'left' }} onClick={() => { setEditNIC(nic); setEditNICType(nic.type as NICDevice['type']); setEditNICVmnet(nic.vmnet); }}>
                <ListItemText
                  primary={`Network Adapter ${nic.index}`}
                  secondary={`Type: ${nic.type}, VMnet: ${nic.vmnet}`}
                />
              </ButtonBase>
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => deleteNICMutation.mutate(nic.index)}>
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        <Dialog open={!!editNIC} onClose={() => setEditNIC(null)}>
          <DialogTitle>Edit Network Adapter</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={editNICType || ''}
                onChange={e => setEditNICType(e.target.value as NICDevice['type'])}
              >
                <MenuItem value="bridged">Bridged</MenuItem>
                <MenuItem value="nat">NAT</MenuItem>
                <MenuItem value="hostonly">Host Only</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="VMnet"
              sx={{ mt: 2 }}
              value={editNICVmnet}
              onChange={e => setEditNICVmnet(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditNIC(null)}>Cancel</Button>
            <Button onClick={() => editNIC && editNICMutation.mutate({ index: editNIC.index, type: editNICType, vmnet: editNICVmnet })} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ p: 0 }}>
          <Typography variant="h6">IP Addresses & Interfaces</Typography>
          {nicIps && nicIps.nics ? (
            <Box>
              <ul style={{ marginTop: 0 }}>
                {Array.isArray(nicIps.nics) ? nicIps.nics.map((nic: VmNicInfo, idx: number) => (
                  <li key={nic.macAddress || idx}>
                    <b>MAC:</b> {nic.macAddress} <b>IP:</b> {nic.ip?.join(', ') || '—'} <b>DHCP:</b> {nic.dhcp4?.enabled ? 'Yes' : 'No'}
                  </li>
                )) : (
                  <li><b>MAC:</b> {nicIps.nics.macAddress} <b>IP:</b> {nicIps.nics.ip?.join(', ') || '—'} <b>DHCP:</b> {nicIps.nics.dhcp4?.enabled ? 'Yes' : 'No'}</li>
                )}
              </ul>
              {nicIps.routes && nicIps.routes.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Routes</Typography>
                  <ul style={{ marginTop: 0 }}>
                    {nicIps.routes.map((route: { dest: string; prefix: string; interface: string; type: string; metric: string }, idx: number) => (
                      <li key={idx}>
                        <b>dest:</b> {route.dest}, <b>prefix:</b> {route.prefix}, <b>interface:</b> {route.interface}, <b>type:</b> {route.type}, <b>metric:</b> {route.metric}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
              {nicIps.dns && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">DNS</Typography>
                  <div>hostname: {nicIps.dns.hostname || '—'}</div>
                  <div>domain: {nicIps.dns.domainname || '—'}</div>
                  <div>servers: {nicIps.dns.server?.join(', ') || '—'}</div>
                </Box>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary">No network interface data.</Typography>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Shared Folders</Typography>
          <Button
            startIcon={<Add />}
          >
            Add Shared Folder
          </Button>
        </Box>

        <List>
          {sharedFolders?.map((folder) => (
            <ListItem key={folder.folder_id}>
              <ButtonBase sx={{ width: '100%', textAlign: 'left' }} onClick={() => { setEditFolder(folder); setEditFolderId(folder.folder_id); setEditFolderPath(folder.host_path); }}>
                <ListItemText
                  primary={folder.folder_id}
                  secondary={folder.host_path}
                />
              </ButtonBase>
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => deleteSharedFolderMutation.mutate(folder.folder_id)}>
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        <Dialog open={!!editFolder} onClose={() => setEditFolder(null)}>
          <DialogTitle>Edit Shared Folder</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Folder ID"
              sx={{ mt: 2 }}
              value={editFolderId}
              disabled
            />
            <TextField
              fullWidth
              label="Host Path"
              sx={{ mt: 2 }}
              value={editFolderPath}
              onChange={e => setEditFolderPath(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditFolder(null)}>Cancel</Button>
            <Button onClick={() => editFolder && editFolderMutation.mutate({ folderId: editFolderId, host_path: editFolderPath })} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6">Restrictions</Typography>
          {restrictions ? (
            <Box>
              <Typography variant="subtitle2">Guest Isolation</Typography>
              <ul style={{ marginTop: 0 }}>
                <li>Copy: {restrictions.guestIsolation?.copyDisabled === 'true' ? 'Disabled' : 'Enabled'}</li>
                <li>Paste: {restrictions.guestIsolation?.pasteDisabled === 'true' ? 'Disabled' : 'Enabled'}</li>
                <li>Drag & Drop: {restrictions.guestIsolation?.dndDisabled === 'true' ? 'Disabled' : 'Enabled'}</li>
                <li>HGFS: {restrictions.guestIsolation?.hgfsDisabled === 'true' ? 'Disabled' : 'Enabled'}</li>
              </ul>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>VNC</Typography>
              <ul style={{ marginTop: 0 }}>
                <li>Enabled: {restrictions.remoteVNC?.VNCEnabled === 'true' ? 'Yes' : 'No'}</li>
                <li>Port: {restrictions.remoteVNC?.VNCPort ?? '—'}</li>
              </ul>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>Devices</Typography>
              <ul style={{ marginTop: 0 }}>
                <li>USB: {restrictions.usbList?.num ?? 0}</li>
                <li>Serial: {restrictions.serialPortList?.num ?? 0}</li>
                <li>Parallel: {restrictions.parallelPortList?.num ?? 0}</li>
                <li>CD/DVD: {restrictions.cddvdList?.num ?? 0}</li>
                <li>Floppy: {restrictions.floopyList?.num ?? 0}</li>
              </ul>
            </Box>
          ) : (
            <Typography color="text.secondary">No restrictions data.</Typography>
          )}
        </Box>
      </TabPanel>
    </Box>
  );
}; 