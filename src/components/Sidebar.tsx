import { Drawer, List, ListItemIcon, ListItemText, Toolbar, Box, ListItemButton } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import ComputerIcon from '@mui/icons-material/Computer';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 220;

const navItems = [
  { label: 'Virtual Machines', icon: <ComputerIcon />, path: '/' },
  { label: 'Networks', icon: <DnsIcon />, path: '/networks' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid #222',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.label}
              selected={location.pathname === item.path || (item.path === '/' && location.pathname === '')}
              onClick={() => navigate(item.path)}
              sx={{ borderRadius: 1, mb: 1, mx: 1 }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}; 