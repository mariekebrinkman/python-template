# Python program to draw circle on GUI
# using Corderius-Play

import play

ball = play.new_circle(color="yellow")
ball.start_physics(can_move=True, stable=False, x_speed=20, y_speed=10, 
                   obeys_gravity=False, bounciness=0, mass=10, friction=0.1)

play.start_program()