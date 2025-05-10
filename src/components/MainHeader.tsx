import { AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, List, ListItemText, Divider, ListItemButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';

export function MainHeader({ onNetworks, onRegister, onLogout }: {
  onNetworks: () => void;
  onRegister: () => void;
  onLogout: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleDrawer = (open: boolean) => () => setDrawerOpen(open);

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: '#202124', color: 'text.primary', borderRadius: 0, boxShadow: 'none', borderBottom: '1px solid #333', maxWidth: 900, mx: 'auto' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', minHeight: 48, px: { xs: 1, sm: 4 } }}>
        <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: -1, fontSize: { xs: 18, sm: 22 } }}>
          VMware Manager
        </Typography>
        {/* Desktop buttons */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'row',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Button color="inherit" onClick={onNetworks} sx={{ fontWeight: 600, textTransform: 'none', px: 2, borderRadius: 2, fontSize: 15, '&:hover': { bgcolor: 'grey.900' } }}>
            Virtual Networks
          </Button>
          <Button color="inherit" onClick={onRegister} sx={{ fontWeight: 600, textTransform: 'none', px: 2, borderRadius: 2, fontSize: 15, '&:hover': { bgcolor: 'grey.900' } }}>
            Register VM
          </Button>
          <Button color="inherit" onClick={onLogout} sx={{ fontWeight: 600, textTransform: 'none', px: 2, borderRadius: 2, fontSize: 15, '&:hover': { bgcolor: 'grey.900' } }}>
            Logout
          </Button>
        </Box>
        {/* Mobile hamburger */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton color="inherit" onClick={handleDrawer(true)}>
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>
      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawer(false)}>
        <Box sx={{ width: 220 }} role="presentation" onClick={handleDrawer(false)}>
          <List>
            <ListItemButton onClick={onNetworks}>
              <ListItemText primary="Virtual Networks" />
            </ListItemButton>
            <ListItemButton onClick={onRegister}>
              <ListItemText primary="Register VM" />
            </ListItemButton>
            <Divider />
            <ListItemButton onClick={onLogout}>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
} 