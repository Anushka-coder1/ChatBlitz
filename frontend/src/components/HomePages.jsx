import { 
  Box, 
  Container, 
  Text, 
  Tabs 
} from '@chakra-ui/react'
import Login from './Authentication/Login'
import Signup from './Authentication/Signup'

const Homepages = () => {
  return (
    <Container maxW="xl" centerContent>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        p={3}
        bg={'white'}
        w="100%"
        m="40px 0 15px 0"
        borderRadius="lg"
        borderWidth="1px"
      >
        <Text fontSize="4xl" color="black">
          {' '}
          CHATBLITZ
        </Text>
      </Box>
      <Box
        p={4}
        bg={'white'}
        color={'black'}
        w="100%"
        m="5px 0 15px 0"
        borderRadius="lg"
        borderWidth="1px"
      >
        <Tabs.Root
          defaultValue="login"
          variant="plain"
          fitted
          css={{
            '--tabs-indicator-bg': 'colors.gray.subtle',
            '--tabs-indicator-shadow': 'shadows.xs',
            '--tabs-trigger-radius': 'radii.full',
          }}
        >
          <Tabs.List mb="1em">
            <Tabs.Trigger value="login" >Login</Tabs.Trigger>
            <Tabs.Trigger value="sign-up" >Sign Up</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="login"><Login/></Tabs.Content>
          <Tabs.Content value="sign-up"><Signup/></Tabs.Content>
        </Tabs.Root>
      </Box>
    </Container>
  )
}

export default Homepages
